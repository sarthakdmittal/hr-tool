const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TaxDeclaration = sequelize.define('TaxDeclaration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  financial_year: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'e.g. 2025-26'
  },
  regime: {
    type: DataTypes.ENUM('old', 'new'),
    defaultValue: 'new'
  },
  // 80C investments
  investments_80c: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'PPF, ELSS, LIC, EPF, etc. (max 1.5L)'
  },
  // HRA related
  hra_rent_paid: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Annual rent paid'
  },
  // Other deductions
  section_80d: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Medical insurance premium'
  },
  section_80e: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Education loan interest'
  },
  section_80g: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Donations'
  },
  section_80tta: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Savings account interest (max 10k)'
  },
  home_loan_interest: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Section 24(b) - max 2L for self-occupied'
  },
  other_deductions: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  nps_80ccd: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'NPS contribution under 80CCD(1B) - additional 50k'
  },
  is_finalized: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'tax_declarations',
  indexes: [
    {
      unique: true,
      fields: ['employee_id', 'financial_year']
    }
  ]
});

module.exports = TaxDeclaration;
