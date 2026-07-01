const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/create-employee-user', auth, requireRole('hr_admin', 'manager'), authController.createEmployeeUser);
router.get('/users', auth, requireRole('hr_admin', 'manager'), authController.listCompanyUsers);
router.put('/users/:id/role', auth, requireRole('hr_admin'), authController.updateUserRole);

module.exports = router;
