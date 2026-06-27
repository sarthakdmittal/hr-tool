const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reportController = require('../controllers/reportController');

router.get('/pf', auth, reportController.getPFReport);
router.get('/pf/ecr', auth, reportController.getPFECR);
router.get('/esic', auth, reportController.getESICReport);
router.get('/tds', auth, reportController.getTDSReport);
router.get('/salary-summary', auth, reportController.getSalarySummary);
router.get('/form16/:employee_id', auth, reportController.getForm16Data);
router.get('/form16/:employee_id/pdf', auth, reportController.getForm16PDF);

module.exports = router;
