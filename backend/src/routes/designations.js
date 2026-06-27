const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const designationController = require('../controllers/designationController');

router.get('/', auth, designationController.listDesignations);
router.post('/', auth, designationController.createDesignation);
router.get('/:id', auth, designationController.getDesignation);
router.put('/:id', auth, designationController.updateDesignation);
router.delete('/:id', auth, designationController.deleteDesignation);

module.exports = router;
