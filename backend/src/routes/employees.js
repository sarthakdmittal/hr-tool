const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const employeeController = require('../controllers/employeeController');

router.get('/', auth, employeeController.listEmployees);
router.post('/', auth, employeeController.createEmployee);
router.get('/:id', auth, employeeController.getEmployee);
router.put('/:id', auth, employeeController.updateEmployee);
router.delete('/:id', auth, employeeController.deleteEmployee);
router.get('/:id/payslips', auth, employeeController.getPayslips);
router.put('/:id/assign-salary-structure', auth, employeeController.assignSalaryStructure);

module.exports = router;
