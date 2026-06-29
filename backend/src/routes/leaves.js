const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/leaveController');

// Leave types
router.get('/types', auth, c.listLeaveTypes);
router.post('/types', auth, c.createLeaveType);
router.put('/types/:id', auth, c.updateLeaveType);
router.delete('/types/:id', auth, c.deleteLeaveType);

// Leave allocations
router.get('/allocations', auth, c.listAllocations);
router.post('/allocations', auth, c.setAllocation);
router.delete('/allocations/:id', auth, c.deleteAllocation);

// Leave balance
router.get('/balance/:employee_id', auth, c.getLeaveBalance);

// Holidays
router.get('/holidays', auth, c.listHolidays);
router.post('/holidays', auth, c.addHoliday);
router.delete('/holidays/:id', auth, c.deleteHoliday);

// Leave requests
router.get('/', auth, c.listLeaves);
router.post('/', auth, c.applyLeave);
router.put('/:id/approve', auth, c.approveLeave);
router.put('/:id/reject', auth, c.rejectLeave);
router.put('/:id/cancel', auth, c.cancelLeave);

module.exports = router;
