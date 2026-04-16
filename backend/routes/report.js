const express = require('express');
const { getDashboardReports } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', protect, getDashboardReports);

module.exports = router;
