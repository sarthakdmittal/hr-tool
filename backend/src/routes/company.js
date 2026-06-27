const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const companyController = require('../controllers/companyController');

router.get('/', auth, companyController.getCompany);
router.put('/', auth, companyController.updateCompany);

module.exports = router;
