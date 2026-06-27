const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const taxController = require('../controllers/taxController');

router.get('/:employee_id', auth, taxController.getTaxDeclaration);
router.post('/', auth, taxController.createOrUpdateDeclaration);
router.put('/:id', auth, taxController.updateDeclaration);

module.exports = router;
