const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ResignationLetter = sequelize.define('ResignationLetter', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  resignation_date: { type: DataTypes.DATEONLY, allowNull: false },
  last_working_date: { type: DataTypes.DATEONLY, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  notice_period_waived: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: {
    type: DataTypes.ENUM('submitted', 'accepted', 'rejected', 'withdrawn'),
    defaultValue: 'submitted'
  },
  hr_notes: { type: DataTypes.TEXT, allowNull: true },
  generated_by: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'resignation_letters'
});

module.exports = ResignationLetter;
