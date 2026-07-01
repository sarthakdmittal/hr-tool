const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

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
  hooks: {
    beforeCreate: async (record) => {
      if (record.password_hash) {
        record.password_hash = await bcrypt.hash(record.password_hash, 12);
      }
    },
  },
});

module.exports = AccountRequest;
