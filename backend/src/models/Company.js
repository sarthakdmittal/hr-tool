const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  logo: {
    type: DataTypes.TEXT,
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
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pan: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  tan: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  cin: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  pf_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  esic_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  pt_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  incorporation_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'companies'
});

module.exports = Company;
