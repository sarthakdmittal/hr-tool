require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize } = require('./models');

const app = express();

// Allow comma-separated list of origins e.g. "https://hr.vercel.app,http://localhost:3000"
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: ${origin} not allowed`));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/company',          require('./routes/company'));
app.use('/api/settings',         require('./routes/company')); // alias
app.use('/api/departments',      require('./routes/departments'));
app.use('/api/designations',     require('./routes/designations'));
app.use('/api/employees',        require('./routes/employees'));
app.use('/api/attendance',       require('./routes/attendance'));
app.use('/api/leaves',           require('./routes/leaves'));
app.use('/api/salary-structures',require('./routes/salaryStructures'));
app.use('/api/payroll',          require('./routes/payroll'));
app.use('/api/reports',          require('./routes/reports'));
app.use('/api/offer-letters',    require('./routes/offerLetters'));
app.use('/api/tax-declarations', require('./routes/taxDeclarations'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

async function runMigrations() {
  if (!process.env.DATABASE_URL) return;
  const stmts = [
    `ALTER TABLE salary_components ALTER COLUMN calculation_type TYPE VARCHAR(50) USING calculation_type::text`,
    `ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS apply_epf BOOLEAN DEFAULT false`,
    `ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS apply_esic BOOLEAN DEFAULT false`,
    `ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS apply_pt BOOLEAN DEFAULT false`,
    // Reset any existing rows that got the old DEFAULT true so statutory deductions are opt-in
    `UPDATE salary_structures SET apply_epf = false, apply_esic = false, apply_pt = false WHERE apply_epf = true AND apply_esic = true AND apply_pt = true`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100)`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year INTEGER`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS gstin VARCHAR(20)`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS lwf_number VARCHAR(50)`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS payroll_day INTEGER`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS working_days_per_month INTEGER`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS epf_employer_rate DECIMAL(5,2)`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS epf_employee_rate DECIMAL(5,2)`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS esic_employer_rate DECIMAL(5,2)`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS esic_employee_rate DECIMAL(5,2)`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS epf_ceiling INTEGER`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS esic_ceiling INTEGER`,
  ];
  for (const sql of stmts) {
    try { await sequelize.query(sql); } catch (_) { /* already applied */ }
  }
}

sequelize.authenticate()
  .then(() => {
    console.log('Database connected');
    return runMigrations();
  })
  .then(() => sequelize.sync())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startKeepAlive();
    });
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

// Ping own /api/health every 14 min so Render free tier doesn't sleep
function startKeepAlive() {
  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  if (!selfUrl) return; // only active on Render

  const INTERVAL = 14 * 60 * 1000; // 14 minutes
  setInterval(async () => {
    try {
      const res = await fetch(`${selfUrl}/api/health`);
      console.log(`[keep-alive] ping ${res.status}`);
    } catch (e) {
      console.warn('[keep-alive] ping failed:', e.message);
    }
  }, INTERVAL);

  console.log(`[keep-alive] pinging ${selfUrl}/api/health every 14 min`);
}
