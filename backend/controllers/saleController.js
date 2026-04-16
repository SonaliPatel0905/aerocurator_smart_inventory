const Sale = require('../models/Sale');
const Component = require('../models/Component');

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
exports.getSales = async (req, res, next) => {
    try {
        const sales = await Sale.find().populate('componentRef', 'name sku category price');
        res.status(200).json({ success: true, count: sales.length, data: sales });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a sale (decreases inventory stock)
// @route   POST /api/sales
// @access  Private
exports.createSale = async (req, res, next) => {
    try {
        const { clientName, componentRef, quantitySold, totalPrice, date } = req.body;

        // Check if component exists
        const component = await Component.findById(componentRef);
        if (!component) {
            return res.status(404).json({ success: false, error: 'Component not found' });
        }

        // Validate stock quantity before sale
        if (component.quantity < quantitySold) {
            return res.status(400).json({ success: false, error: 'Insufficient stock to fulfill sale' });
        }

        // Create Sale Ledger Entry
        const sale = await Sale.create({
            clientName,
            componentRef,
            quantitySold,
            totalPrice,
            date,
            createdBy: req.user.id
        });

        // Atomic update of component quantity
        component.quantity -= parseInt(quantitySold);
        await component.save();

        res.status(201).json({ success: true, data: sale });
    } catch (error) {
        next(error);
    }
};
