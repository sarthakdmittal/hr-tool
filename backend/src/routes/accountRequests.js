const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const ctrl = require('../controllers/accountRequestController');

const hr = requireRole('hr_admin', 'manager');

router.post('/', ctrl.createRequest);                         // public
router.get('/', auth, hr, ctrl.listRequests);
router.put('/:id/approve', auth, hr, ctrl.approveRequest);
router.put('/:id/reject', auth, hr, ctrl.rejectRequest);
router.delete('/:id', auth, hr, ctrl.deleteRequest);

module.exports = router;
