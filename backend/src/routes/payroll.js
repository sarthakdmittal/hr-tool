const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const payrollController = require('../controllers/payrollController');

router.get('/', auth, payrollController.listSlips);
router.post('/run', auth, payrollController.runPayroll);
router.get('/runs', auth, payrollController.listRuns);
router.get('/runs/:run_id', auth, payrollController.getRun);
router.get('/runs/:run_id/items', auth, payrollController.getRunItems);
router.put('/runs/:run_id/lock', auth, payrollController.lockRun);
router.get('/slip/:payroll_item_id', auth, payrollController.getSlip);
router.get('/slip/:payroll_item_id/pdf', auth, payrollController.getSlipPDF);
router.get('/employee/:employee_id/slip', auth, payrollController.getEmployeeSlip);

module.exports = router;
