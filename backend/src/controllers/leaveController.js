const { Leave, LeaveType, LeaveAllocation, Employee, Holiday } = require('../models');
const { Op } = require('sequelize');

// ─── Leave Types ───────────────────────────────────────────────────────────────

exports.listLeaveTypes = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const types = await LeaveType.findAll({
      where: { company_id },
      order: [['name', 'ASC']],
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
      company_id, name, code,
      days_allowed_per_year: days_allowed_per_year || 0,
      carry_forward: !!carry_forward,
      max_carry_forward_days: max_carry_forward_days || 0,
      paid: paid !== false,
      is_active: true,
      description,
    });
    res.status(201).json(leaveType);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { id } = req.params;
    const lt = await LeaveType.findOne({ where: { id, company_id } });
    if (!lt) return res.status(404).json({ error: 'Leave type not found' });
    const { name, code, days_allowed_per_year, carry_forward, max_carry_forward_days, paid, description, is_active } = req.body;
    await lt.update({ name, code, days_allowed_per_year, carry_forward, max_carry_forward_days, paid, description, is_active });
    res.json(lt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { id } = req.params;
    const lt = await LeaveType.findOne({ where: { id, company_id } });
    if (!lt) return res.status(404).json({ error: 'Leave type not found' });
    const usedCount = await Leave.count({ where: { leave_type_id: id } });
    if (usedCount > 0) {
      await lt.update({ is_active: false });
      return res.json({ message: 'Leave type deactivated (has existing leave records)' });
    }
    await lt.destroy();
    res.json({ message: 'Leave type deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Leave Allocations ─────────────────────────────────────────────────────────

exports.listAllocations = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [employees, leaveTypes] = await Promise.all([
      Employee.findAll({
        where: { company_id, status: 'active' },
        attributes: ['id', 'emp_id', 'first_name', 'last_name'],
        order: [['first_name', 'ASC'], ['last_name', 'ASC']],
      }),
      LeaveType.findAll({ where: { company_id, is_active: { [Op.ne]: false } }, order: [['name', 'ASC']] }),
    ]);

    const empIds = employees.map(e => e.id);
    const allocations = empIds.length
      ? await LeaveAllocation.findAll({ where: { employee_id: empIds, year } })
      : [];

    const approvedLeaves = empIds.length
      ? await Leave.findAll({
          where: {
            employee_id: empIds,
            status: 'approved',
            from_date: { [Op.gte]: `${year}-01-01` },
            to_date: { [Op.lte]: `${year}-12-31` },
          },
        })
      : [];

    const result = employees.map(emp => {
      const empLeaves = approvedLeaves.filter(l => l.employee_id === emp.id);
      const empAllocs = allocations.filter(a => a.employee_id === emp.id);

      const balances = leaveTypes.map(lt => {
        const alloc = empAllocs.find(a => a.leave_type_id === lt.id);
        const allocated = alloc ? parseFloat(alloc.allocated_days) : parseFloat(lt.days_allowed_per_year);
        const used = empLeaves
          .filter(l => l.leave_type_id === lt.id)
          .reduce((s, l) => s + parseFloat(l.days), 0);
        return {
          leave_type_id: lt.id,
          allocation_id: alloc?.id || null,
          name: lt.name,
          code: lt.code,
          allocated,
          used,
          balance: Math.max(0, allocated - used),
          is_custom: !!alloc,
        };
      });

      return {
        employee_id: emp.id,
        emp_id: emp.emp_id,
        name: `${emp.first_name} ${emp.last_name}`,
        balances,
      };
    });

    res.json({ year, employees: result, leave_types: leaveTypes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setAllocation = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { employee_id, leave_type_id, year, allocated_days } = req.body;
    if (!employee_id || !leave_type_id || allocated_days == null) {
      return res.status(400).json({ error: 'employee_id, leave_type_id, and allocated_days are required' });
    }
    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const leaveType = await LeaveType.findOne({ where: { id: leave_type_id, company_id } });
    if (!leaveType) return res.status(404).json({ error: 'Leave type not found' });

    const allocYear = year || new Date().getFullYear();
    const [allocation] = await LeaveAllocation.findOrCreate({
      where: { employee_id, leave_type_id, year: allocYear },
      defaults: { allocated_days },
    });
    if (allocation.allocated_days !== allocated_days) {
      await allocation.update({ allocated_days });
    }
    res.json(allocation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAllocation = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { id } = req.params;
    const alloc = await LeaveAllocation.findByPk(id, {
      include: [{ model: Employee, where: { company_id }, attributes: [] }],
    });
    if (!alloc) return res.status(404).json({ error: 'Allocation not found' });
    await alloc.destroy();
    res.json({ message: 'Custom allocation removed; will use leave type default' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Leave Requests ────────────────────────────────────────────────────────────

exports.listLeaves = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { employee_id, status, month, year } = req.query;

    const employeeWhere = { company_id };
    // Employees can only see their own leaves
    if (req.user.role === 'employee') {
      employeeWhere.id = req.user.employee_id;
    } else if (employee_id) {
      employeeWhere.id = employee_id;
    }

    const leaveWhere = {};
    if (status) leaveWhere.status = status;
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      leaveWhere[Op.or] = [
        { from_date: { [Op.between]: [startDate, endDate] } },
        { to_date: { [Op.between]: [startDate, endDate] } },
      ];
    }

    const leaves = await Leave.findAll({
      where: leaveWhere,
      include: [
        { model: Employee, where: employeeWhere, attributes: ['id', 'emp_id', 'first_name', 'last_name'] },
        { model: LeaveType, attributes: ['id', 'name', 'code'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const result = leaves.map(l => ({
      id: l.id,
      employee_id: l.employee_id,
      emp_id: l.Employee.emp_id,
      employee_name: `${l.Employee.first_name} ${l.Employee.last_name}`,
      leave_type_id: l.leave_type_id,
      leave_type: l.LeaveType?.name || '',
      leave_type_code: l.LeaveType?.code || '',
      from_date: l.from_date,
      to_date: l.to_date,
      days: parseFloat(l.days),
      reason: l.reason,
      status: l.status,
      rejection_reason: l.rejection_reason,
      approved_at: l.approved_at,
      created_at: l.createdAt,
    }));

    res.json(result);
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

    const leave = await Leave.create({ employee_id, leave_type_id, from_date, to_date, days, reason, status: 'pending' });
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
      include: [{ model: Employee, where: { company_id } }],
    });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ error: 'Only pending leaves can be approved' });
    await leave.update({ status: 'approved', approved_by: req.user.id, approved_at: new Date() });
    res.json(leave);
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
      include: [{ model: Employee, where: { company_id } }],
    });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ error: 'Only pending leaves can be rejected' });
    await leave.update({ status: 'rejected', rejection_reason });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const leave = await Leave.findOne({
      where: { id },
      include: [{ model: Employee, where: { company_id } }],
    });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (!['pending', 'approved'].includes(leave.status)) {
      return res.status(400).json({ error: 'Cannot cancel this leave' });
    }
    await leave.update({ status: 'cancelled' });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Leave Balance ─────────────────────────────────────────────────────────────

exports.getLeaveBalance = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const company_id = req.user.company_id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const [leaveTypes, allocations, approvedLeaves] = await Promise.all([
      LeaveType.findAll({ where: { company_id, is_active: true } }),
      LeaveAllocation.findAll({ where: { employee_id, year } }),
      Leave.findAll({
        where: {
          employee_id,
          status: 'approved',
          from_date: { [Op.gte]: `${year}-01-01` },
          to_date: { [Op.lte]: `${year}-12-31` },
        },
      }),
    ]);

    const balances = leaveTypes.map(lt => {
      const alloc = allocations.find(a => a.leave_type_id === lt.id);
      const allocated = alloc ? parseFloat(alloc.allocated_days) : parseFloat(lt.days_allowed_per_year);
      const used = approvedLeaves
        .filter(l => l.leave_type_id === lt.id)
        .reduce((s, l) => s + parseFloat(l.days), 0);
      return {
        leave_type_id: lt.id,
        allocation_id: alloc?.id || null,
        name: lt.name,
        code: lt.code,
        allocated,
        used,
        balance: Math.max(0, allocated - used),
        is_custom: !!alloc,
      };
    });

    res.json({ employee_id: parseInt(employee_id), year, balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Holidays ─────────────────────────────────────────────────────────────────

exports.listHolidays = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { year } = req.query;
    const where = { company_id };
    if (year) where.date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
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

exports.deleteHoliday = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { id } = req.params;
    const holiday = await Holiday.findOne({ where: { id, company_id } });
    if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
    await holiday.destroy();
    res.json({ message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
