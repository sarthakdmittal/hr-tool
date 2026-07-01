const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AccountRequest = sequelize.define('AccountRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  hr_notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'account_requests',
  timestamps: true,
  underscored: true,
});

module.exports = AccountRequest;
