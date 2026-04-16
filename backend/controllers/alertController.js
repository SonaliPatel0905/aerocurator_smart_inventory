const Component = require('../models/Component');

// @desc    Get low stock items
// @route   GET /api/alerts/low-stock
// @access  Private
exports.getLowStockAlerts = async (req, res, next) => {
    try {
        // Find components where quantity is less than their minStockThreshold
        const lowStockItems = await Component.find({
            $expr: { $lt: ["$quantity", "$minStockThreshold"] }
        });

        res.status(200).json({
            success: true,
            count: lowStockItems.length,
            data: lowStockItems
        });
    } catch (error) {
        next(error);
    }
};
