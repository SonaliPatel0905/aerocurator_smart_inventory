const express = require('express');
const { getPurchases, createPurchase } = require('../controllers/purchaseController');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

router
    .route('/')
    .get(protect, getPurchases)
    .post(
        protect,
        [
            body('supplierName', 'Supplier name is required').notEmpty(),
            body('componentRef', 'Component Reference (ID) is required').notEmpty(),
            body('quantity', 'Quantity is required and must be numeric').isNumeric(),
            body('totalCost', 'Total Cost is required and must be numeric').isNumeric()
        ],
        validate,
        createPurchase
    );

module.exports = router;
