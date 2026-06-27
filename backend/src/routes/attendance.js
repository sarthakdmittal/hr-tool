const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

router.post('/mark', auth, attendanceController.markAttendance);
router.post('/bulk', auth, attendanceController.bulkMarkAttendance);
router.get('/', auth, attendanceController.listAttendance);
router.get('/report', auth, attendanceController.getAttendanceReport);
router.get('/employee/:employee_id/summary', auth, attendanceController.getEmployeeAttendanceSummary);

module.exports = router;
