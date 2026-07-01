const jwt = require('jsonwebtoken');
const { User, Company, Employee } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, company_id: user.company_id, employee_id: user.employee_id || null },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '7d' }
  );
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, company_name, company_address, company_city, company_state } = req.body;

    if (!name || !email || !password || !company_name) {
      return res.status(400).json({ error: 'Name, email, password and company name are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create company first
    const company = await Company.create({
      name: company_name,
      address: company_address || null,
      city: company_city || null,
      state: company_state || null
    });

    // Create user with company
    const user = await User.create({
      name,
      email,
      password_hash: password,
      role: 'hr_admin',
      company_id: company.id
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: user.toJSON(),
      company
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const company = user.company_id ? await Company.findByPk(user.company_id) : null;
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON(),
      company
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
};

exports.listCompanyUsers = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const users = await User.findAll({
      where: { company_id },
      attributes: ['id', 'name', 'email', 'role', 'employee_id', 'is_active', 'created_at'],
      order: [['created_at', 'ASC']],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { role } = req.body;
    const allowed = ['employee', 'manager', 'hr_admin'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be employee, manager, or hr_admin' });
    }

    const user = await User.findOne({ where: { id: req.params.id, company_id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });

    await user.update({ role });
    res.json({ message: 'Role updated', user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEmployeeUser = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { employee_id, email, password, name } = req.body;

    if (!employee_id || !email || !password || !name) {
      return res.status(400).json({ error: 'employee_id, email, password, and name are required' });
    }

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const existingLink = await User.findOne({ where: { employee_id, company_id } });
    if (existingLink) return res.status(400).json({ error: 'This employee already has a user account' });

    const user = await User.create({
      name,
      email,
      password_hash: password,
      role: 'employee',
      company_id,
      employee_id
    });

    res.status(201).json({ message: 'Employee account created', user: user.toJSON() });
  } catch (err) {
    console.error('Create employee user error:', err);
    res.status(500).json({ error: err.message });
  }
};
