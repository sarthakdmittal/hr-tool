const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SalaryComponent = sequelize.define('SalaryComponent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  structure_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Short code like BASIC, HRA, TA, etc.'
  },
  type: {
    type: DataTypes.ENUM('earning', 'deduction', 'employer_contribution'),
    allowNull: false,
    defaultValue: 'earning'
  },
  calculation_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'fixed'
  },
  value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 0,
    comment: 'Fixed amount OR percentage value'
  },
  taxable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sequence_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'salary_components'
});

module.exports = SalaryComponent;
