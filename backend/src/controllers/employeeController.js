const { Employee, Department, Designation, SalaryStructure, PayrollItem, PayrollRun } = require('../models');
const { Op } = require('sequelize');

exports.listEmployees = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { status, department_id, search } = req.query;

    const where = { company_id };
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { emp_id: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const employees = await Employee.findAll({
      where,
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: Designation, attributes: ['id', 'name'] }
      ],
      order: [['first_name', 'ASC'], ['last_name', 'ASC']]
    });

    res.json(employees);
  } catch (err) {
    console.error('List employees error:', err);
    res.status(500).json({ error: err.message });
  }
};

const sanitizeFields = (obj) => {
  const out = { ...obj };
  ['dob', 'joining_date', 'termination_date'].forEach((f) => {
    if (out[f] === '' || out[f] === 'Invalid date') out[f] = null;
  });
  ['gender', 'employment_type'].forEach((f) => {
    if (out[f] === '') out[f] = null;
  });
  return out;
};

exports.createEmployee = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const data = sanitizeFields({ ...req.body, company_id });

    // Validate required fields
    if (!data.emp_id || !data.first_name || !data.last_name || !data.email || !data.joining_date) {
      return res.status(400).json({ error: 'emp_id, first_name, last_name, email, and joining_date are required' });
    }

    const employee = await Employee.create(data);
    res.status(201).json(employee);
  } catch (err) {
    console.error('Create employee error:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Employee ID or email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const employee = await Employee.findOne({
      where: { id, company_id },
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: Designation, attributes: ['id', 'name'] },
        { model: SalaryStructure, attributes: ['id', 'name'] },
        { model: Employee, as: 'Manager', attributes: ['id', 'first_name', 'last_name', 'emp_id'] }
      ]
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (err) {
    console.error('Get employee error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const employee = await Employee.findOne({ where: { id, company_id } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Prevent changing company_id
    const { company_id: _, ...rawUpdate } = req.body;
    const updateData = sanitizeFields(rawUpdate);
    await employee.update(updateData);

    res.json({ message: 'Employee updated successfully', employee });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const employee = await Employee.findOne({ where: { id, company_id } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Soft delete - set status to inactive
    await employee.update({ status: 'inactive', termination_date: new Date() });

    res.json({ message: 'Employee deactivated successfully' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPayslips = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const employee = await Employee.findOne({ where: { id, company_id } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const payslips = await PayrollItem.findAll({
      where: { employee_id: id },
      include: [{
        model: PayrollRun,
        attributes: ['id', 'month', 'year', 'status'],
        where: { company_id }
      }],
      order: [[PayrollRun, 'year', 'DESC'], [PayrollRun, 'month', 'DESC']]
    });

    res.json(payslips);
  } catch (err) {
    console.error('Get payslips error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.assignSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const { salary_structure_id, ctc } = req.body;

    if (!salary_structure_id || !ctc) {
      return res.status(400).json({ error: 'salary_structure_id and ctc are required' });
    }

    const employee = await Employee.findOne({ where: { id, company_id } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const structure = await SalaryStructure.findOne({ where: { id: salary_structure_id, company_id } });
    if (!structure) {
      return res.status(404).json({ error: 'Salary structure not found' });
    }

    await employee.update({ salary_structure_id, ctc });

    res.json({ message: 'Salary structure assigned successfully', employee });
  } catch (err) {
    console.error('Assign salary structure error:', err);
    res.status(500).json({ error: err.message });
  }
};
