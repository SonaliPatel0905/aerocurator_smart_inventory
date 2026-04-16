const express = require('express');
const { getSales, createSale } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

router
    .route('/')
    .get(protect, getSales)
    .post(
        protect,
        [
            body('clientName', 'Client name is required').notEmpty(),
            body('componentRef', 'Component Reference (ID) is required').notEmpty(),
            body('quantitySold', 'Quantity is required and must be numeric').isNumeric(),
            body('totalPrice', 'Total Price is required and must be numeric').isNumeric()
        ],
        validate,
        createSale
    );

module.exports = router;
