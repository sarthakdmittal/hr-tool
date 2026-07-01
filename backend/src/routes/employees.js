const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const employeeController = require('../controllers/employeeController');
const hr = requireRole('hr_admin', 'manager');

router.get('/', auth, employeeController.listEmployees);
router.post('/', auth, hr, employeeController.createEmployee);
router.get('/:id', auth, employeeController.getEmployee);
router.put('/:id', auth, hr, employeeController.updateEmployee);
router.delete('/:id', auth, hr, employeeController.deleteEmployee);
router.get('/:id/payslips', auth, employeeController.getPayslips);
router.put('/:id/assign-salary-structure', auth, hr, employeeController.assignSalaryStructure);

module.exports = router;
