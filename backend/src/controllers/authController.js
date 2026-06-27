const jwt = require('jsonwebtoken');
const { User, Company } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, company_id: user.company_id },
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
