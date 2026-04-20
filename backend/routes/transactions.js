const express = require('express');
const router = express.Router();
const { Purchase, Sale } = require('../models/Ledger');
const Component = require('../models/Component');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ok, err } = require('../utils');

router.get('/purchases', requireAuth, async (req, res) => {
    const list = await Purchase.find({}).sort({ date: -1 }).populate('component_id', 'name sku');
    return ok(res, list.map(i => i.toJSON()));
});

// @route   POST /api/purchase
// @desc    Record a purchase and update stock
router.post('/purchase', requireAuth, requireAdmin, async (req, res) => {
    const { supplier, component_id, quantity, cost_per_unit, notes } = req.body;
    if(quantity < 1) return err(res, "Quantity must be positive", 400);
    
    try {
        const item = await Component.findById(component_id);
        if(!item) return err(res, "Component not found", 404);
        
        const total_cost = quantity * cost_per_unit;
        
        // Manual sequential update (standalone MongoDB support)
        item.quantity += Number(quantity);
        await item.save();
        
        const purchase = await Purchase.create({ supplier, component_id, quantity, cost_per_unit, total_cost, notes });
        return ok(res, purchase.toJSON(), "Purchase recorded and stock updated", 201);
    } catch (error) {
        return err(res, error.message, 500);
    }
});

router.get('/sales', requireAuth, async (req, res) => {
    const list = await Sale.find({}).sort({ date: -1 }).populate('component_id', 'name sku');
    return ok(res, list.map(i => i.toJSON()));
});

// @route   POST /api/sales
// @desc    Record a sale and update stock
router.post('/sales', requireAuth, requireAdmin, async (req, res) => {
    const { customer, component_id, quantity, price_per_unit, notes } = req.body;
    if (quantity <= 0) return err(res, "Quantity must be positive", 400);

    try {
        const item = await Component.findById(component_id);
        if (!item || item.quantity < quantity) {
            return err(res, "Insufficient stock", 409);
        }

        const total_price = quantity * price_per_unit;

        // Manual sequential update (standalone MongoDB support)
        item.quantity -= Number(quantity);
        await item.save();

        const sale = await Sale.create({
            customer: customer || "Unknown",
            component_id,
            quantity,
            price_per_unit,
            total_price,
            notes: notes || ""
        });
        
        return ok(res, sale.toJSON(), "Sale recorded and stock updated");
    } catch (e) {
        return err(res, e.message, 500);
    }
});

module.exports = router;
