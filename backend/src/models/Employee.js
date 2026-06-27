const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  emp_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  joining_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  designation_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  bank_account_no: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  bank_ifsc: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  pan_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  aadhaar_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  uan_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  esic_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  employment_type: {
    type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'intern'),
    defaultValue: 'full_time'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'terminated', 'on_notice'),
    defaultValue: 'active'
  },
  salary_structure_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  ctc: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0
  },
  is_metro: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether employee is in metro city (for HRA calculation)'
  },
  termination_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'employees',
  indexes: [
    {
      unique: true,
      fields: ['company_id', 'emp_id']
    },
    {
      unique: true,
      fields: ['company_id', 'email']
    }
  ]
});

module.exports = Employee;
