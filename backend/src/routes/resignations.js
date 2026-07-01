const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const resignationController = require('../controllers/resignationController');

router.get('/', auth, resignationController.listResignations);
router.post('/', auth, resignationController.createResignation);
router.put('/:id/status', auth, resignationController.updateStatus);
router.get('/:id/pdf', auth, resignationController.getResignationPDF);
router.delete('/:id', auth, resignationController.deleteResignation);

module.exports = router;
