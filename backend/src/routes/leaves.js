const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const leaveController = require('../controllers/leaveController');

router.get('/types', auth, leaveController.listLeaveTypes);
router.post('/types', auth, leaveController.createLeaveType);
router.get('/holidays', auth, leaveController.listHolidays);
router.post('/holidays', auth, leaveController.addHoliday);
router.get('/balance/:employee_id', auth, leaveController.getLeaveBalance);
router.get('/', auth, leaveController.listLeaves);
router.post('/', auth, leaveController.applyLeave);
router.put('/:id/approve', auth, leaveController.approveLeave);
router.put('/:id/reject', auth, leaveController.rejectLeave);

module.exports = router;
