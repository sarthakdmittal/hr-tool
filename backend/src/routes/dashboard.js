const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', auth, dashboardController.getStats);
router.get('/attendance-chart', auth, dashboardController.getAttendanceChart);
router.get('/recent-payrolls', auth, dashboardController.getRecentPayrolls);

module.exports = router;
