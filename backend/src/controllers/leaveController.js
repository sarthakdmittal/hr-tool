const { Leave, LeaveType, Employee, Holiday } = require('../models');
const { Op } = require('sequelize');

exports.listLeaveTypes = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const types = await LeaveType.findAll({
      where: { company_id, is_active: true },
      order: [['name', 'ASC']]
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createLeaveType = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { name, code, days_allowed_per_year, carry_forward, max_carry_forward_days, paid, description } = req.body;

    if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

    const leaveType = await LeaveType.create({
      company_id, name, code, days_allowed_per_year, carry_forward, max_carry_forward_days, paid, description
    });
    res.status(201).json(leaveType);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listLeaves = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { employee_id, status, month, year } = req.query;

    const employeeWhere = { company_id };
    if (employee_id) employeeWhere.id = employee_id;

    const leaveWhere = {};
    if (status) leaveWhere.status = status;
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      leaveWhere[Op.or] = [
        { from_date: { [Op.between]: [startDate, endDate] } },
        { to_date: { [Op.between]: [startDate, endDate] } }
      ];
    }

    const leaves = await Leave.findAll({
      where: leaveWhere,
      include: [
        {
          model: Employee,
          where: employeeWhere,
          attributes: ['id', 'emp_id', 'first_name', 'last_name']
        },
        { model: LeaveType, attributes: ['id', 'name', 'code'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.applyLeave = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { employee_id, leave_type_id, from_date, to_date, days, reason } = req.body;

    if (!employee_id || !leave_type_id || !from_date || !to_date || !days) {
      return res.status(400).json({ error: 'employee_id, leave_type_id, from_date, to_date, and days are required' });
    }

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const leaveType = await LeaveType.findOne({ where: { id: leave_type_id, company_id } });
    if (!leaveType) return res.status(404).json({ error: 'Leave type not found' });

    const leave = await Leave.create({
      employee_id, leave_type_id, from_date, to_date, days, reason, status: 'pending'
    });

    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const leave = await Leave.findOne({
      where: { id },
      include: [{ model: Employee, where: { company_id } }]
    });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ error: 'Only pending leaves can be approved' });

    await leave.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date()
    });

    res.json({ message: 'Leave approved', leave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const { rejection_reason } = req.body;

    const leave = await Leave.findOne({
      where: { id },
      include: [{ model: Employee, where: { company_id } }]
    });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ error: 'Only pending leaves can be rejected' });

    await leave.update({ status: 'rejected', rejection_reason });

    res.json({ message: 'Leave rejected', leave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLeaveBalance = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const company_id = req.user.company_id;
    const year = req.query.year || new Date().getFullYear();

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const leaveTypes = await LeaveType.findAll({ where: { company_id, is_active: true } });

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const approvedLeaves = await Leave.findAll({
      where: {
        employee_id,
        status: 'approved',
        from_date: { [Op.between]: [startDate, endDate] }
      }
    });

    const balances = leaveTypes.map(lt => {
      const usedDays = approvedLeaves
        .filter(l => l.leave_type_id === lt.id)
        .reduce((sum, l) => sum + parseFloat(l.days), 0);

      return {
        leave_type_id: lt.id,
        name: lt.name,
        code: lt.code,
        allowed: parseFloat(lt.days_allowed_per_year),
        used: usedDays,
        balance: Math.max(0, parseFloat(lt.days_allowed_per_year) - usedDays)
      };
    });

    res.json({ employee_id: parseInt(employee_id), year: parseInt(year), balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listHolidays = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { year } = req.query;

    const where = { company_id };
    if (year) {
      where.date = {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`]
      };
    }

    const holidays = await Holiday.findAll({ where, order: [['date', 'ASC']] });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addHoliday = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { name, date, description, holiday_type } = req.body;

    if (!name || !date) return res.status(400).json({ error: 'name and date are required' });

    const holiday = await Holiday.create({ company_id, name, date, description, holiday_type });
    res.status(201).json(holiday);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
