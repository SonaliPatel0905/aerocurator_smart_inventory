const express = require('express');
const router = express.Router();
const Component = require('../models/Component');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ok, err } = require('../utils');

router.get('/inventory', requireAuth, async (req, res) => {
    const search = req.query.search;
    let query = {};
    if (search) {
        query = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ]
        };
    }
    
    try {
        const items = await Component.find(query).sort({ name: 1 });
        return ok(res, items.map(i => i.toJSON()));
    } catch (error) {
        return err(res, error.message, 500);
    }
});

router.post('/inventory/add', requireAuth, requireAdmin, async (req, res) => {
    const { name, category, sku, quantity, price, low_stock_threshold } = req.body;
    
    if (!name || name.trim() === "") return err(res, "Component Name cannot be empty.", 400);
    if (!category || category.trim() === "") return err(res, "Category cannot be empty.", 400);
    if (isNaN(quantity) || quantity < 0) return err(res, "Quantity must be a valid positive number.", 400);
    if (isNaN(price) || price < 0) return err(res, "Price must be a valid positive number.", 400);

    try {
        const item = await Component.create({ name, category, sku, quantity: quantity||0, price: price||0, low_stock_threshold: low_stock_threshold||10 });
        return ok(res, item.toJSON(), "Item added", 201);
    } catch (error) {
        return err(res, error.message, 400); // Trigger Mongoose validation bounds
    }
});

router.put('/inventory/update/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const item = await Component.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if(!item) return err(res, "Item not found", 404);
        return ok(res, item.toJSON(), "Item updated");
    } catch (error) {
        return err(res, error.message, 400);
    }
});

router.delete('/inventory/delete/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const item = await Component.findByIdAndDelete(req.params.id);
        if(!item) return err(res, "Item not found", 404);
        return ok(res, null, "Item deleted");
    } catch (error) {
        return err(res, error.message, 500);
    }
});

router.get('/inventory/categories', requireAuth, async (req, res) => {
    const categories = await Component.distinct('category');
    return ok(res, categories);
});

module.exports = router;
