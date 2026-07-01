const { Attendance, Employee, Department, Designation, Leave } = require('../models');
const { Op } = require('sequelize');

exports.markAttendance = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { employee_id, date, status, check_in, check_out, remarks, leave_id } = req.body;

    if (!employee_id || !date || !status) {
      return res.status(400).json({ error: 'employee_id, date, and status are required' });
    }

    // Verify employee belongs to company
    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Block if approved leave exists for this date
    const approvedLeave = await Leave.findOne({
      where: {
        employee_id,
        status: 'approved',
        from_date: { [Op.lte]: date },
        to_date: { [Op.gte]: date },
      },
    });
    if (approvedLeave) {
      return res.status(400).json({ error: 'Employee has an approved leave on this date. Cancel the leave first.' });
    }

    // Upsert attendance record
    const [attendance, created] = await Attendance.findOrCreate({
      where: { employee_id, date },
      defaults: { status, check_in, check_out, remarks, leave_id }
    });

    if (!created) {
      await attendance.update({ status, check_in, check_out, remarks, leave_id });
    }

    res.status(created ? 201 : 200).json({ message: created ? 'Attendance marked' : 'Attendance updated', attendance });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.bulkMarkAttendance = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    // employee_id can be at top level (single employee bulk) or per-record (multi employee)
    const { employee_id: topEmployeeId, records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array is required' });
    }

    // Resolve employee_id for each record
    const resolved = records.map(r => ({
      ...r,
      employee_id: r.employee_id || topEmployeeId,
    }));

    // Verify all employees belong to company
    const employeeIds = [...new Set(resolved.map(r => r.employee_id).filter(Boolean))];
    if (employeeIds.length === 0) {
      return res.status(400).json({ error: 'employee_id is required' });
    }
    const employees = await Employee.findAll({ where: { id: employeeIds, company_id } });
    if (employees.length !== employeeIds.length) {
      return res.status(400).json({ error: 'One or more employees not found in your company' });
    }

    const results = [];
    for (const record of resolved) {
      const { employee_id, date, status, check_in, check_out, remarks, leave_id } = record;
      if (!employee_id || !date || !status) continue;

      const [attendance, created] = await Attendance.findOrCreate({
        where: { employee_id, date },
        defaults: { status, check_in, check_out, remarks, leave_id }
      });

      if (!created) {
        await attendance.update({ status, check_in, check_out, remarks, leave_id });
      }
      results.push({ employee_id, date, status: created ? 'created' : 'updated' });
    }

    res.json({ message: `${results.length} attendance records processed`, results });
  } catch (err) {
    console.error('Bulk attendance error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.listAttendance = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { employee_id, month, year, date } = req.query;

    const employeeWhere = { company_id };
    // Employees can only see their own attendance
    if (req.user.role === 'employee') {
      employeeWhere.id = req.user.employee_id;
    } else if (employee_id) {
      employeeWhere.id = employee_id;
    }

    const attendanceWhere = {};
    if (date) {
      attendanceWhere.date = date;
    } else if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      attendanceWhere.date = { [Op.between]: [startDate, endDate] };
    }

    const attendanceRecords = await Attendance.findAll({
      where: attendanceWhere,
      include: [{
        model: Employee,
        where: employeeWhere,
        attributes: ['id', 'emp_id', 'first_name', 'last_name'],
        include: [
          { model: Department, attributes: ['id', 'name'] },
          { model: Designation, attributes: ['id', 'name'] }
        ]
      }],
      order: [['date', 'DESC'], [Employee, 'first_name', 'ASC']]
    });

    res.json(attendanceRecords);
  } catch (err) {
    console.error('List attendance error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const employees = await Employee.findAll({
      where: { company_id, status: 'active' },
      attributes: ['id', 'emp_id', 'first_name', 'last_name'],
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: Designation, attributes: ['id', 'name'] },
        {
          model: Attendance,
          where: { date: { [Op.between]: [startDate, endDate] } },
          required: false
        }
      ]
    });

    const report = employees.map(emp => {
      const attendance = emp.Attendances || [];
      const summary = {
        present: 0, absent: 0, half_day: 0, wfh: 0,
        holiday: 0, leave: 0, lop: 0, week_off: 0
      };

      for (const record of attendance) {
        if (summary.hasOwnProperty(record.status)) {
          summary[record.status]++;
        }
      }

      return {
        employee_id: emp.id,
        emp_id: emp.emp_id,
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.Department ? emp.Department.name : '',
        designation: emp.Designation ? emp.Designation.name : '',
        ...summary,
        total_records: attendance.length
      };
    });

    res.json({ month: parseInt(month), year: parseInt(year), report });
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.clearAttendance = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { employee_id, month, year } = req.body;

    if (!employee_id || !month || !year) {
      return res.status(400).json({ error: 'employee_id, month, and year are required' });
    }

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const deleted = await Attendance.destroy({
      where: { employee_id, date: { [Op.between]: [startDate, endDate] } }
    });

    res.json({ message: `Cleared ${deleted} attendance records` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { month, year } = req.query;
    const company_id = req.user.company_id;

    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const records = await Attendance.findAll({
      where: {
        employee_id,
        date: { [Op.between]: [startDate, endDate] }
      },
      order: [['date', 'ASC']]
    });

    const summary = {
      present: 0, absent: 0, half_day: 0, week_off: 0,
      holiday: 0, leave: 0, lop: 0, overtime: 0,
    };

    // Status is stored as short codes, possibly comma-separated (e.g. "P,OT")
    for (const record of records) {
      const codes = record.status ? record.status.split(',').map(s => s.trim()) : [];
      if (codes.includes('P'))     summary.present++;
      if (codes.includes('A'))     summary.absent++;
      if (codes.includes('P/2'))   summary.half_day++;
      if (codes.includes('W'))     summary.week_off++;
      if (codes.includes('H'))     summary.holiday++;
      if (codes.includes('L'))     summary.leave++;
      if (codes.includes('LOP'))   summary.lop++;
      if (codes.includes('OT') || codes.includes('OT/2')) summary.overtime++;
    }

    const paidDays = summary.present + (summary.half_day * 0.5) + summary.week_off + summary.holiday + summary.leave + summary.overtime;
    const lopDays = summary.lop + summary.absent;

    res.json({
      employee_id: parseInt(employee_id),
      month: parseInt(month),
      year: parseInt(year),
      summary,
      paid_days: paidDays,
      lop_days: lopDays,
      records
    });
  } catch (err) {
    console.error('Employee attendance summary error:', err);
    res.status(500).json({ error: err.message });
  }
};
