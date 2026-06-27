const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PayrollRun = sequelize.define('PayrollRun', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 12 }
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'processed', 'locked'),
    defaultValue: 'draft'
  },
  run_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  run_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'payroll_runs',
  indexes: [
    {
      unique: true,
      fields: ['company_id', 'month', 'year']
    }
  ]
});

module.exports = PayrollRun;
