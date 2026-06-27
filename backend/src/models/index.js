const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Company = require('./Company');
const Department = require('./Department');
const Designation = require('./Designation');
const Employee = require('./Employee');
const SalaryStructure = require('./SalaryStructure');
const SalaryComponent = require('./SalaryComponent');
const Attendance = require('./Attendance');
const LeaveType = require('./LeaveType');
const Leave = require('./Leave');
const Holiday = require('./Holiday');
const PayrollRun = require('./PayrollRun');
const PayrollItem = require('./PayrollItem');
const TaxDeclaration = require('./TaxDeclaration');
const OfferLetter = require('./OfferLetter');

// Associations
Company.hasMany(Department, { foreignKey: 'company_id' });
Department.belongsTo(Company, { foreignKey: 'company_id' });

Company.hasMany(Designation, { foreignKey: 'company_id' });
Designation.belongsTo(Company, { foreignKey: 'company_id' });
Department.hasMany(Designation, { foreignKey: 'department_id' });
Designation.belongsTo(Department, { foreignKey: 'department_id' });

Company.hasMany(Employee, { foreignKey: 'company_id' });
Employee.belongsTo(Company, { foreignKey: 'company_id' });
Department.hasMany(Employee, { foreignKey: 'department_id' });
Employee.belongsTo(Department, { foreignKey: 'department_id' });
Designation.hasMany(Employee, { foreignKey: 'designation_id' });
Employee.belongsTo(Designation, { foreignKey: 'designation_id' });
Employee.hasMany(Employee, { as: 'Subordinates', foreignKey: 'manager_id' });
Employee.belongsTo(Employee, { as: 'Manager', foreignKey: 'manager_id' });

SalaryStructure.hasMany(SalaryComponent, { foreignKey: 'structure_id', as: 'components' });
SalaryComponent.belongsTo(SalaryStructure, { foreignKey: 'structure_id' });
Employee.belongsTo(SalaryStructure, { foreignKey: 'salary_structure_id' });

Employee.hasMany(Attendance, { foreignKey: 'employee_id' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id' });

Employee.hasMany(Leave, { foreignKey: 'employee_id' });
Leave.belongsTo(Employee, { foreignKey: 'employee_id' });
LeaveType.hasMany(Leave, { foreignKey: 'leave_type_id' });
Leave.belongsTo(LeaveType, { foreignKey: 'leave_type_id' });

Company.hasMany(PayrollRun, { foreignKey: 'company_id' });
PayrollRun.belongsTo(Company, { foreignKey: 'company_id' });
PayrollRun.hasMany(PayrollItem, { foreignKey: 'payroll_run_id', as: 'items' });
PayrollItem.belongsTo(PayrollRun, { foreignKey: 'payroll_run_id' });
Employee.hasMany(PayrollItem, { foreignKey: 'employee_id' });
PayrollItem.belongsTo(Employee, { foreignKey: 'employee_id', include: [Department, Designation] });

Employee.hasMany(TaxDeclaration, { foreignKey: 'employee_id' });
TaxDeclaration.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = {
  sequelize, User, Company, Department, Designation, Employee,
  SalaryStructure, SalaryComponent, Attendance, LeaveType, Leave,
  Holiday, PayrollRun, PayrollItem, TaxDeclaration, OfferLetter
};
