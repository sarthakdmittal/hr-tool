const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const salaryController = require('../controllers/salaryController');

router.get('/', auth, salaryController.listStructures);
router.post('/', auth, salaryController.createStructure);
router.get('/:id', auth, salaryController.getStructure);
router.put('/:id', auth, salaryController.updateStructure);
router.delete('/:id', auth, salaryController.deleteStructure);
router.get('/:id/components', auth, salaryController.listComponents);
router.post('/:id/components', auth, salaryController.addComponent);
router.put('/:id/components/:comp_id', auth, salaryController.updateComponent);
router.delete('/:id/components/:comp_id', auth, salaryController.deleteComponent);

module.exports = router;
