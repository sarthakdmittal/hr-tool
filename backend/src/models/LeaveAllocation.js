const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeaveAllocation = sequelize.define('LeaveAllocation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  leave_type_id: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  allocated_days: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
}, {
  tableName: 'leave_allocations',
  indexes: [{ unique: true, fields: ['employee_id', 'leave_type_id', 'year'] }],
});

module.exports = LeaveAllocation;
