const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Component = require('../models/Component');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ok, err } = require('../utils');

// @route   POST /api/requests
// @desc    User requests a product
router.post('/requests', requireAuth, async (req, res) => {
    try {
        const { component_id, quantity, reason } = req.body;
        
        // Validation
        if (!component_id || !quantity) {
            return err(res, 'Component ID and quantity are required');
        }

        const component = await Component.findById(component_id);
        if (!component) return err(res, 'Component not found');

        const request = new Request({
            component_id,
            user_id: req.user.id,
            quantity: parseInt(quantity),
            reason: reason || ''
        });

        await request.save();
        return ok(res, request, 'Order request submitted successfully');
    } catch (e) {
        return err(res, e.message);
    }
});

// @route   GET /api/requests
// @desc    Get all requests (Admin) or User's requests
router.get('/requests', requireAuth, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role !== 'admin') {
            filter.user_id = req.user.id;
        }

        const requests = await Request.find(filter)
            .populate('component_id', 'name sku quantity')
            .populate('user_id', 'name email')
            .sort({ created_at: -1 });

        return ok(res, requests);
    } catch (e) {
        return err(res, e.message);
    }
});

// @route   PATCH /api/requests/:id
// @desc    Update request status (Admin only)
router.patch('/requests/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'denied', 'pending'].includes(status)) {
            return err(res, 'Invalid status');
        }

        const request = await Request.findById(req.params.id);
        if (!request) return err(res, 'Request not found');

        // Fulfillment Logic: If approved, subtract from inventory
        if (status === 'approved' && request.status !== 'approved') {
            const component = await Component.findById(request.component_id);
            if (!component) return err(res, 'Target component no longer exists in catalog.');
            if (component.quantity < request.quantity) {
                 return err(res, `Insufficient hangar stock. Available: ${component.quantity}, Requested: ${request.quantity}`);
            }
            component.quantity -= request.quantity;
            await component.save();
        }

        request.status = status;
        await request.save();

        return ok(res, request, `Request ${status} successfully`);
    } catch (e) {
        return err(res, e.message);
    }
});

module.exports = router;
