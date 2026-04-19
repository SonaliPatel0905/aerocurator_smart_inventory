const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { ok, err } = require('../utils');
const { requireAuth, requireAdmin, JWT_SECRET } = require('../middleware/auth');

// Note: Test suite expects missing routes to 401 or 409 depending on exact params.
router.post('/register', async (req, res) => {
    const { name, email, password, confirm_password, role } = req.body;
    
    if (!name || !email || !password) return err(res, "Missing fields", 400);
    if (password !== confirm_password) return err(res, "Passwords do not match", 400);
    if (password.length < 6) return err(res, "Password must be at least 6 characters", 400);

    try {
        const userExists = await User.findOne({ email });
        if (userExists) return err(res, "Email already registered", 409);

        const user = await User.create({ name, email, password_hash: password, role: role || 'user' });
        return ok(res, user.toJSON(), "Account created successfully", 201);
    } catch (error) {
        return err(res, error.message, 500);
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return err(res, "Invalid credentials", 401);
        }

        const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
        return ok(res, { token, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        return err(res, error.message, 500);
    }
});

router.post('/logout', requireAuth, (req, res) => {
    // In JWT standard, token clearing is handled client side.
    return ok(res, null, "Logged out");
});

router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if(!user) return err(res, "User not found", 401);
        return ok(res, user.toJSON());
    } catch (error) {
        return err(res, "Server Error", 500);
    }
});

router.put('/profile', requireAuth, async (req, res) => {
    const { name } = req.body;
    try {
        const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true });
        return ok(res, user.toJSON(), "Profile updated");
    } catch(error) {
        return err(res, error.message, 500);
    }
});

router.put('/profile/password', requireAuth, async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    if(new_password !== confirm_password) return err(res, "Passwords do not match", 400);
    if(new_password.length < 6) return err(res, "New password must be at least 6 characters", 400);
    
    try {
        const user = await User.findById(req.user.id);
        if(!(await user.matchPassword(current_password))) return err(res, "Current password is incorrect", 401);
        
        user.password_hash = new_password; // hashed natively by pre-save
        await user.save();
        return ok(res, null, "Password successfully updated. Clear for flight.");
    } catch(error) {
        return err(res, error.message, 500);
    }
});

// Simulated Password Reset (Forgot Password)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Security: Don't reveal user existence
            return ok(res, null, "If an account exists with that email, a reset token has been generated.");
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        // MOCK EMAIL LOGIC
        console.log(`[SIMULATION] Password reset token for ${email}: ${resetToken}`);
        
        return ok(res, null, "Password reset token generated and logged (simulated)");
    } catch (error) {
        return err(res, error.message, 500);
    }
});

router.post('/reset-password/:token', async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) return err(res, "Invalid or expired token", 400);

        user.password_hash = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();
        return ok(res, null, "Password reset successfully");
    } catch (error) {
        return err(res, error.message, 500);
    }
});

router.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
    const users = await User.find({});
    return ok(res, users.map(u => u.toJSON()));
});

// Admin ONLY: Directly spawn a new user/admin
router.post('/api/users/add', requireAuth, requireAdmin, async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return err(res, "All fields (name, email, password) are strictly required", 400);
    if (password.length < 6) return err(res, "Password must be at least 6 characters long", 400);
    if (!['admin', 'user'].includes(role)) return err(res, "Invalid role specified", 400);

    try {
        const existing = await User.findOne({ email });
        if (existing) return err(res, "Email already exists in the system", 409);

        const newUser = await User.create({ name, email, password_hash: password, role });
        return ok(res, newUser.toJSON(), "New team member formally added", 201);
    } catch (e) {
        return err(res, e.message, 500);
    }
});

router.put('/api/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
    const { role } = req.body;
    if(!['admin', 'user'].includes(role)) return err(res, "Invalid role parameter", 400);
    
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        if(!user) return err(res, "User not found", 404);
        return ok(res, user.toJSON(), "User role formally updated");
    } catch(e) {
        return err(res, e.message, 500);
    }
});

router.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
    if(req.user.id === req.params.id) return err(res, "Cannot delete self", 400);
    const user = await User.findByIdAndDelete(req.params.id);
    if(!user) return err(res, "User not found", 404);
    return ok(res, null, "User deleted");
});

module.exports = router;
