const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    // Comma-separated codes: P, A, W, P/2, H, OT, OT/2
    // Single: "P"  Multi: "P,OT"  "P,OT/2"  "W,OT" etc.
    type: DataTypes.TEXT,
    allowNull: false
  },
  check_in: {
    type: DataTypes.TIME,
    allowNull: true
  },
  check_out: {
    type: DataTypes.TIME,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  leave_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to leave application if status is leave'
  }
}, {
  tableName: 'attendance',
  indexes: [
    {
      unique: true,
      fields: ['employee_id', 'date']
    }
  ]
});

module.exports = Attendance;
