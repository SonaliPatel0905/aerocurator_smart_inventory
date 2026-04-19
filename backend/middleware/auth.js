const jwt = require('jsonwebtoken');
const { err } = require('../utils');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

const requireAuth = (req, res, next) => {
    const authHeader = req.header('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
        return err(res, 'Missing or invalid Authorization header', 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, role, email }
        next();
    } catch (error) {
        return err(res, 'Invalid or expired token', 401);
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return err(res, 'Admin access required', 403);
    }
};

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
