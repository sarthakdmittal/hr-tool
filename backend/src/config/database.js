const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL) {
  // Production: PostgreSQL (Neon / Supabase / Render)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    },
    define: {
      underscored: false,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  });
} else {
  // Local development: SQLite (zero setup)
  const sqlite3 = require('sqlite3');
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../hr_tool.db');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
    dialectOptions: {
      mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE | sqlite3.OPEN_FULLMUTEX,
    },
    define: {
      underscored: false,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  });
}

module.exports = sequelize;
