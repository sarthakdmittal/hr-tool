const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PayrollItem = sequelize.define('PayrollItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  payroll_run_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  working_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0
  },
  paid_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0
  },
  lop_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0
  },
  gross_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  basic_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  hra: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  epf_employee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  epf_employer: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  eps_employer: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  esic_employee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  esic_employer: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  professional_tax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  tds: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_deductions: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  net_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  components_json: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Detailed breakdown of all components'
  }
}, {
  tableName: 'payroll_items',
  indexes: [
    {
      unique: true,
      fields: ['payroll_run_id', 'employee_id']
    }
  ]
});

module.exports = PayrollItem;
