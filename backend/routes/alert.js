const express = require('express');
const { getLowStockAlerts } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/low-stock', protect, getLowStockAlerts);

module.exports = router;
