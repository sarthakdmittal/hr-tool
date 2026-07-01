const { AccountRequest, Employee, User, Company } = require('../models');

// POST /api/account-requests  (no auth — public endpoint)
exports.createRequest = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find the employee by work email to determine company
    const employee = await Employee.findOne({ where: { email } });
    if (!employee) {
      return res.status(404).json({ error: 'No employee found with this email. Please contact your HR admin.' });
    }

    // Check no active user account already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Try signing in.' });
    }

    // Check no pending/approved request already exists
    const existing = await AccountRequest.findOne({
      where: { email, status: ['pending', 'approved'] },
    });
    if (existing) {
      return res.status(400).json({
        error: existing.status === 'pending'
          ? 'A request is already pending for this email. Please wait for HR approval.'
          : 'This email was already approved. Try signing in.',
      });
    }

    await AccountRequest.create({
      company_id: employee.company_id,
      employee_id: employee.id,
      name,
      email,
      password_hash: password, // hashed by model hook
    });

    res.status(201).json({ message: 'Access request submitted. HR will review and approve your account.' });
  } catch (err) {
    console.error('Account request create error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/account-requests  (HR only)
exports.listRequests = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { status } = req.query;

    const where = { company_id };
    if (status) where.status = status;

    const requests = await AccountRequest.findAll({
      where,
      include: [{
        model: Employee,
        attributes: ['id', 'emp_id', 'first_name', 'last_name', 'email'],
        required: false,
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(requests);
  } catch (err) {
    console.error('List account requests error:', err);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/account-requests/:id/approve  (HR only)
exports.approveRequest = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const request = await AccountRequest.findOne({ where: { id: req.params.id, company_id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    // Ensure no duplicate user
    const existingUser = await User.findOne({ where: { email: request.email } });
    if (existingUser) {
      await request.update({ status: 'approved' });
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Create the user — password already hashed in AccountRequest, bypass hook with direct insert
    await User.create({
      name: request.name,
      email: request.email,
      password_hash: request.password_hash,
      role: 'employee',
      company_id,
      employee_id: request.employee_id,
    }, { hooks: false }); // skip re-hash since already hashed

    await request.update({ status: 'approved', hr_notes: req.body.hr_notes || request.hr_notes });

    res.json({ message: 'Account approved and created successfully' });
  } catch (err) {
    console.error('Approve account request error:', err);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/account-requests/:id/reject  (HR only)
exports.rejectRequest = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const request = await AccountRequest.findOne({ where: { id: req.params.id, company_id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    await request.update({ status: 'rejected', hr_notes: req.body.hr_notes || null });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('Reject account request error:', err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/account-requests/:id  (HR only)
exports.deleteRequest = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const request = await AccountRequest.findOne({ where: { id: req.params.id, company_id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    await request.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
