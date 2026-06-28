const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    req.user = await User.findByPk(decoded.id);
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch (err) {
    // DB error — don't treat as auth failure; return 503 so the frontend
    // doesn't clear the token and redirect to login
    console.error('Auth middleware DB error:', err.message);
    res.status(503).json({ error: 'Service temporarily unavailable' });
  }
};
