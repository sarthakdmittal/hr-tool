const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const departmentController = require('../controllers/departmentController');

router.get('/', auth, departmentController.listDepartments);
router.post('/', auth, departmentController.createDepartment);
router.get('/:id', auth, departmentController.getDepartment);
router.put('/:id', auth, departmentController.updateDepartment);
router.delete('/:id', auth, departmentController.deleteDepartment);

module.exports = router;
