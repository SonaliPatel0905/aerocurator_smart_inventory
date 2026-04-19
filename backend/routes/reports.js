const express = require('express');
const router = express.Router();
const Component = require('../models/Component');
const { Purchase, Sale } = require('../models/Ledger');
const { requireAuth } = require('../middleware/auth');
const { ok, err } = require('../utils');

router.get('/alerts', requireAuth, async (req, res) => {
    try {
        const items = await Component.find({ $expr: { $lte: ["$quantity", "$low_stock_threshold"] } }).sort({ quantity: 1 });
        
        const mapped = items.map(item => {
            let severity = 'low';
            if (item.quantity === 0) severity = 'critical';
            else if (item.quantity <= item.low_stock_threshold * 0.5) severity = 'warning';
            return {
                id: item._id,
                name: item.name,
                sku: item.sku,
                quantity: item.quantity,
                low_stock_threshold: item.low_stock_threshold,
                severity: severity
            };
        });
        
        return ok(res, mapped);
    } catch(e) { return err(res, e.message); }
});

router.get('/dashboard/stats', requireAuth, async (req, res) => {
    try {
        const totalItems = await Component.countDocuments();
        const valueAgg = await Component.aggregate([
            { $group: { _id: null, totalValue: { $sum: { $multiply: ["$quantity", "$price"] } } } }
        ]);
        const total_value = valueAgg[0] ? valueAgg[0].totalValue : 0;
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        const startOfMonth = new Date(`${currentMonth}-01T00:00:00.000Z`);
        
        const purchases = await Purchase.aggregate([
            { $match: { date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$total_cost" } } }
        ]);
        
        const sales = await Sale.aggregate([
            { $match: { date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$total_price" } } }
        ]);
        
        const low_stock_count = await Component.countDocuments({ $expr: { $lte: ["$quantity", "$low_stock_threshold"] } });
        
        const recent_purchases = await Purchase.find().sort({ date: -1 }).limit(5).populate('component_id');
        const recent_sales = await Sale.find().sort({ date: -1 }).limit(5).populate('component_id');

        // Sub-Task: Pending Requests
        const Request = require('../models/Request');
        const pending_requests_count = await Request.countDocuments({ status: 'pending' });

        return ok(res, {
            total_items: totalItems,
            total_value: total_value,
            purchases_this_month: purchases[0] ? purchases[0].total : 0,
            sales_this_month: sales[0] ? sales[0].total : 0,
            low_stock_count,
            pending_requests_count,
            recent_purchases: recent_purchases.map(p => p.toJSON()),
            recent_sales: recent_sales.map(s => s.toJSON())
        });
    } catch(e) { return err(res, e.message); }
});

router.get('/reports/data', requireAuth, async (req, res) => {
    try {
        const category_breakdown = await Component.aggregate([
            { $group: { _id: "$category", item_count: { $sum: 1 }, total_qty: { $sum: "$quantity" }, total_value: { $sum: { $multiply: ["$quantity", "$price"] } } } },
            { $project: { _id: 0, category: "$_id", item_count: 1, total_qty: 1, total_value: 1 } },
            { $sort: { total_value: -1 } }
        ]);

        const monthly_sales = await Sale.aggregate([
            { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, revenue: { $sum: "$total_price" }, units_sold: { $sum: "$quantity" } } },
            { $project: { _id: 0, month: "$_id", revenue: 1, units_sold: 1 } },
            { $sort: { month: 1 } },
            { $limit: 6 }
        ]);

        const monthly_purchases = await Purchase.aggregate([
            { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, cost: { $sum: "$total_cost" }, units_bought: { $sum: "$quantity" } } },
            { $project: { _id: 0, month: "$_id", cost: 1, units_bought: 1 } },
            { $sort: { month: 1 } },
            { $limit: 6 }
        ]);
        
        const top_components = await Sale.aggregate([
            { $group: { _id: "$component_id", total_sold: { $sum: "$quantity" }, total_revenue: { $sum: "$total_price" } } },
            { $lookup: { from: "components", localField: "_id", foreignField: "_id", as: "comp" } },
            { $unwind: "$comp" },
            { $project: { _id: 0, name: "$comp.name", category: "$comp.category", total_sold: 1, total_revenue: 1 } },
            { $sort: { total_sold: -1 } },
            { $limit: 5 }
        ]);

        return ok(res, {
            category_breakdown,
            monthly_sales,
            monthly_purchases,
            top_components
        });
    } catch(e) { return err(res, e.message); }
});

module.exports = router;
