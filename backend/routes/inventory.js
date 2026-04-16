const express = require('express');
const {
    getComponents,
    getComponent,
    createComponent,
    updateComponent,
    deleteComponent
} = require('../controllers/inventoryController');

const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

router
    .route('/')
    .get(protect, getComponents)
    .post(
        protect,
        [
            body('name', 'Name is required').notEmpty(),
            body('sku', 'SKU is required').notEmpty(),
            body('price', 'Price is required and must be a number').isNumeric()
        ],
        validate,
        createComponent
    );

router
    .route('/:id')
    .get(protect, getComponent)
    .put(protect, authorize('admin', 'staff'), updateComponent)
    .delete(protect, authorize('admin'), deleteComponent);

module.exports = router;
