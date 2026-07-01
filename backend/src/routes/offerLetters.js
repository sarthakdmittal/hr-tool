const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const offerLetterController = require('../controllers/offerLetterController');

router.post('/generate', auth, offerLetterController.generateOfferLetter);
router.get('/', auth, offerLetterController.listOfferLetters);
router.get('/:id', auth, offerLetterController.getOfferLetter);
router.get('/:id/pdf', auth, offerLetterController.getOfferLetterPDF);
router.delete('/:id', auth, offerLetterController.deleteOfferLetter);

module.exports = router;
