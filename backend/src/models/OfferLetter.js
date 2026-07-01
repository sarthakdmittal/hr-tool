const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OfferLetter = sequelize.define('OfferLetter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Optional - may generate for candidates not yet employees'
  },
  candidate_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  candidate_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  candidate_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  designation: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  joining_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  ctc: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  reporting_manager: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  probation_period: {
    type: DataTypes.INTEGER,
    defaultValue: 6,
    comment: 'In months'
  },
  notice_period: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
    comment: 'In months'
  },
  ctc_breakup: {
    type: DataTypes.JSON,
    allowNull: true
  },
  additional_terms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  offer_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  valid_till: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'accepted', 'rejected', 'expired'),
    defaultValue: 'draft'
  },
  generated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'offer_letters'
});

module.exports = OfferLetter;
