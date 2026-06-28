const { Employee, Attendance, Leave, PayrollRun, PayrollItem, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getStats = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [totalEmployees, presentToday, onLeaveToday, payrollRun] = await Promise.all([
      Employee.count({ where: { company_id, status: 'active' } }),

      Attendance.count({
        where: { date: today },
        include: [{
          model: Employee,
          where: { company_id },
          attributes: [],
          required: true,
        }],
      }),

      Leave.count({
        where: {
          status: 'approved',
          from_date: { [Op.lte]: today },
          to_date: { [Op.gte]: today },
        },
        include: [{
          model: Employee,
          where: { company_id },
          attributes: [],
          required: true,
        }],
      }),

      PayrollRun.findOne({
        where: { company_id, month, year },
        attributes: ['id', 'status'],
      }),
    ]);

    let payrollThisMonth = null;
    if (payrollRun) {
      const agg = await PayrollItem.findOne({
        where: { payroll_run_id: payrollRun.id },
        attributes: [[sequelize.fn('SUM', sequelize.col('gross_salary')), 'total']],
        raw: true,
      });
      payrollThisMonth = parseFloat(agg?.total) || 0;
    }

    res.json({
      total_employees: totalEmployees,
      present_today: presentToday,
      on_leave_today: onLeaveToday,
      payroll_this_month: payrollThisMonth,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAttendanceChart = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNum = d.getMonth() + 1;
      const yearNum = d.getFullYear();
      const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
      const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0];
      const monthLabel = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      const rows = await Attendance.findAll({
        where: { date: { [Op.between]: [startDate, endDate] } },
        include: [{ model: Employee, where: { company_id }, attributes: [], required: true }],
        attributes: ['status'],
        raw: true,
      });

      let present = 0, absent = 0;
      for (const row of rows) {
        const codes = String(row.status || '').split(',').map(s => s.trim());
        if (codes.some(c => ['P', 'H', 'W', 'OT'].includes(c))) present++;
        else if (codes.includes('A')) absent++;
        else if (codes.some(c => ['P/2', 'OT/2'].includes(c))) present += 0.5;
      }

      result.push({ month: monthLabel, present: Math.round(present), absent: Math.round(absent) });
    }

    res.json(result);
  } catch (err) {
    console.error('Attendance chart error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getRecentPayrolls = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const runs = await PayrollRun.findAll({
      where: { company_id },
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit: 5,
    });

    const result = await Promise.all(runs.map(async (run) => {
      const agg = await PayrollItem.findOne({
        where: { payroll_run_id: run.id },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'emp_count'],
          [sequelize.fn('SUM', sequelize.col('gross_salary')), 'total_gross'],
        ],
        raw: true,
      });
      return {
        id: run.id,
        month: run.month,
        year: run.year,
        status: run.status,
        total_employees: parseInt(agg?.emp_count) || 0,
        total_gross: parseFloat(agg?.total_gross) || 0,
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Recent payrolls error:', err);
    res.status(500).json({ error: err.message });
  }
};
