require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize } = require('./models');

const app = express();

// Allow comma-separated list of origins. Supports wildcards, e.g. "https://*.vercel.app"
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

function originAllowed(origin) {
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.includes('*')) {
      const pattern = '^' + allowed.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+') + '$';
      return new RegExp(pattern).test(origin);
    }
    return allowed === origin;
  });
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || originAllowed(origin)) {
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
app.use('/api/dashboard',        require('./routes/dashboard'));
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
    `CREATE TABLE IF NOT EXISTS leave_allocations (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      allocated_days DECIMAL(5,1) NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (employee_id, leave_type_id, year)
    )`,
    // Ensure leave_types columns exist (they may be missing if table was created before model was updated)
    `ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS paid BOOLEAN`,
    `ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN`,
    `ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS carry_forward BOOLEAN`,
    `ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS max_carry_forward_days DECIMAL(5,1)`,
    `ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS description TEXT`,
    // Backfill NULL values to sensible defaults
    `UPDATE leave_types SET paid = TRUE WHERE paid IS NULL`,
    `UPDATE leave_types SET is_active = TRUE WHERE is_active IS NULL`,
    `UPDATE leave_types SET carry_forward = FALSE WHERE carry_forward IS NULL`,
    `UPDATE leave_types SET max_carry_forward_days = 0 WHERE max_carry_forward_days IS NULL`,
    // Ensure leaves table has all columns (may be missing if table was created before model was updated)
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS approved_by INTEGER`,
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE`,
    // Add 'cancelled' to the status ENUM if it was created before that value existed
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled'
         AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_leaves_status'))
       THEN ALTER TYPE "enum_leaves_status" ADD VALUE 'cancelled'; END IF;
     END $$`,
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
