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

router.post('/purchase', requireAuth, requireAdmin, async (req, res) => {
    const { supplier, component_id, quantity, cost_per_unit, notes } = req.body;
    if(quantity < 1) return err(res, "Quantity must be positive", 400);
    
    try {
        const item = await Component.findById(component_id);
        if(!item) return err(res, "Component not found", 404);
        
        const total_cost = quantity * cost_per_unit;
        
        // Transaction emulation
        item.quantity += Number(quantity);
        await item.save();
        
        const purchase = await Purchase.create({ supplier, component_id, quantity, cost_per_unit, total_cost, notes });
        return ok(res, purchase.toJSON(), "Purchase recorded", 201);
    } catch (error) {
        return err(res, error.message, 500);
    }
});
router.get('/sales', requireAuth, async (req, res) => {
    const list = await Sale.find({}).sort({ date: -1 }).populate('component_id', 'name sku');
    return ok(res, list.map(i => i.toJSON()));
});

router.post('/purchase', requireAuth, requireAdmin, async (req, res) => {
    const { component_id, quantity, price } = req.body;
    if (quantity <= 0) return err(res, "Quantity must be positive", 400);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const item = await Component.findById(component_id).session(session);
        if (!item) {
            await session.abortTransaction();
            return err(res, "Item not found", 404);
        }

        item.quantity += quantity;
        await item.save({ session });

        const purchase = new Purchase({
            component_id, component_name: item.name, quantity, price,
            total_price: quantity * price, buyer_id: req.user.id
        });
        await purchase.save({ session });
        await session.commitTransaction();
        return ok(res, purchase, "Purchase recorded and stock updated");
    } catch (e) {
        await session.abortTransaction();
        return err(res, e.message, 500);
    } finally {
        session.endSession();
    }
});

router.post('/sales', requireAuth, requireAdmin, async (req, res) => {
    const { component_id, quantity, price } = req.body;
    if (quantity <= 0) return err(res, "Quantity must be positive", 400);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const item = await Component.findById(component_id).session(session);
        if (!item || item.quantity < quantity) {
            await session.abortTransaction();
            return err(res, "Insufficient stock", 409);
        }

        item.quantity -= quantity;
        await item.save({ session });

        const sale = new Sale({
            component_id, component_name: item.name, quantity, price,
            total_price: quantity * price, seller_id: req.user.id
        });
        await sale.save({ session });
        await session.commitTransaction();
        return ok(res, sale, "Sale recorded and stock updated");
    } catch (e) {
        await session.abortTransaction();
        return err(res, e.message, 500);
    } finally {
        session.endSession();
    }
});

module.exports = router;
