const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeaveType = sequelize.define('LeaveType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'e.g. CL, SL, EL, LOP'
  },
  days_allowed_per_year: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0
  },
  carry_forward: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  max_carry_forward_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: true,
    defaultValue: 0
  },
  paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'leave_types'
});

module.exports = LeaveType;
