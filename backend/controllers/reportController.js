const Component = require('../models/Component');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');

// @desc    Get dashboard metrics and aggregations
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardReports = async (req, res, next) => {
    try {
        // 1. Total Components
        const totalComponents = await Component.countDocuments();

        // 2. Total Sales & Purchases Value
        const salesAggregation = await Sale.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
        ]);
        
        const purchasesAggregation = await Purchase.aggregate([
            { $group: { _id: null, totalSpending: { $sum: '$totalCost' } } }
        ]);

        const totalSalesValue = salesAggregation[0] ? salesAggregation[0].totalRevenue : 0;
        const totalPurchasesValue = purchasesAggregation[0] ? purchasesAggregation[0].totalSpending : 0;

        // 3. Components by Category
        const categoryDistribution = await Component.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity' } } }
        ]);

        // 4. Sales Trends (last 6 months placeholder logic - actual logic can filter by date)
        // Groups sales by month
        const monthlySales = await Sale.aggregate([
            {
                $group: {
                    _id: { $month: "$date" },
                    revenue: { $sum: "$totalPrice" },
                    itemsSold: { $sum: "$quantitySold" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalComponents,
                totalSalesValue,
                totalPurchasesValue,
                categoryDistribution,
                monthlySales
            }
        });
    } catch (error) {
        next(error);
    }
};
