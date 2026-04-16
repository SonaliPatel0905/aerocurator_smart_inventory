const Purchase = require('../models/Purchase');
const Component = require('../models/Component');

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
exports.getPurchases = async (req, res, next) => {
    try {
        const purchases = await Purchase.find().populate('componentRef', 'name sku category price');
        res.status(200).json({ success: true, count: purchases.length, data: purchases });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a purchase (increases inventory stock)
// @route   POST /api/purchases
// @access  Private
exports.createPurchase = async (req, res, next) => {
    try {
        const { supplierName, componentRef, quantity, totalCost, date } = req.body;

        // Check if component exists
        const component = await Component.findById(componentRef);
        if (!component) {
            return res.status(404).json({ success: false, error: 'Component not found' });
        }

        // Create Purchase Ledger Entry
        const purchase = await Purchase.create({
            supplierName,
            componentRef,
            quantity,
            totalCost,
            date,
            createdBy: req.user.id
        });

        // Atomic update of component quantity
        component.quantity += parseInt(quantity);
        await component.save();

        res.status(201).json({ success: true, data: purchase });
    } catch (error) {
        next(error);
    }
};
