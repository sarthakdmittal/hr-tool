const {
  Employee, Department, Designation, SalaryStructure, SalaryComponent,
  Attendance, TaxDeclaration, PayrollRun, PayrollItem, Company
} = require('../models');
const { Op } = require('sequelize');
const { calculatePayrollForEmployee } = require('../services/payrollService');
const { generateSalarySlip } = require('../services/pdfService');

exports.runPayroll = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { month, year, notes } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    // Check if payroll already exists
    const existingRun = await PayrollRun.findOne({ where: { company_id, month, year } });
    if (existingRun && existingRun.status === 'locked') {
      return res.status(400).json({ error: 'Payroll for this month is already locked' });
    }

    // Create or update payroll run
    let payrollRun;
    if (existingRun) {
      payrollRun = existingRun;
      await payrollRun.update({ status: 'draft', run_by: req.user.id, run_date: new Date(), notes });
    } else {
      payrollRun = await PayrollRun.create({
        company_id, month, year, status: 'draft',
        run_by: req.user.id, run_date: new Date(), notes
      });
    }

    // Get all active employees with salary structure
    const employees = await Employee.findAll({
      where: {
        company_id,
        status: 'active',
        salary_structure_id: { [Op.not]: null },
        ctc: { [Op.gt]: 0 }
      }
    });

    // Date range for attendance
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const financialYear = month >= 4 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`;

    const results = [];
    const errors = [];

    for (const employee of employees) {
      try {
        // Get salary components
        const components = await SalaryComponent.findAll({
          where: { structure_id: employee.salary_structure_id, is_active: true },
          order: [['sequence_order', 'ASC']]
        });

        // Get attendance records
        const attendanceRecords = await Attendance.findAll({
          where: {
            employee_id: employee.id,
            date: { [Op.between]: [startDate, endDate] }
          }
        });

        // Get tax declaration
        const taxDeclaration = await TaxDeclaration.findOne({
          where: { employee_id: employee.id, financial_year: financialYear }
        });

        // Calculate payroll
        const calculation = calculatePayrollForEmployee(
          employee, month, year, attendanceRecords, taxDeclaration, components
        );

        // Save or update PayrollItem
        const [item, created] = await PayrollItem.findOrCreate({
          where: { payroll_run_id: payrollRun.id, employee_id: employee.id },
          defaults: {
            working_days: calculation.working_days,
            paid_days: calculation.paid_days,
            lop_days: calculation.lop_days,
            gross_salary: calculation.gross_salary,
            basic_salary: calculation.basic_salary,
            hra: calculation.hra,
            epf_employee: calculation.epf_employee,
            epf_employer: calculation.epf_employer,
            eps_employer: calculation.eps_employer,
            esic_employee: calculation.esic_employee,
            esic_employer: calculation.esic_employer,
            professional_tax: calculation.professional_tax,
            tds: calculation.tds,
            total_deductions: calculation.total_deductions,
            net_salary: calculation.net_salary,
            components_json: calculation.components_json
          }
        });

        if (!created) {
          await item.update({
            working_days: calculation.working_days,
            paid_days: calculation.paid_days,
            lop_days: calculation.lop_days,
            gross_salary: calculation.gross_salary,
            basic_salary: calculation.basic_salary,
            hra: calculation.hra,
            epf_employee: calculation.epf_employee,
            epf_employer: calculation.epf_employer,
            eps_employer: calculation.eps_employer,
            esic_employee: calculation.esic_employee,
            esic_employer: calculation.esic_employer,
            professional_tax: calculation.professional_tax,
            tds: calculation.tds,
            total_deductions: calculation.total_deductions,
            net_salary: calculation.net_salary,
            components_json: calculation.components_json
          });
        }

        results.push({ employee_id: employee.id, emp_id: employee.emp_id, net_salary: calculation.net_salary });
      } catch (empErr) {
        errors.push({ employee_id: employee.id, emp_id: employee.emp_id, error: empErr.message });
      }
    }

    await payrollRun.update({ status: 'processed' });

    res.json({
      message: 'Payroll processed successfully',
      payroll_run_id: payrollRun.id,
      month, year,
      processed: results.length,
      errors: errors.length,
      results,
      errors
    });
  } catch (err) {
    console.error('Run payroll error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.listRuns = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const runs = await PayrollRun.findAll({
      where: { company_id },
      order: [['year', 'DESC'], ['month', 'DESC']]
    });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRun = async (req, res) => {
  try {
    const { run_id } = req.params;
    const company_id = req.user.company_id;

    const run = await PayrollRun.findOne({ where: { id: run_id, company_id } });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });

    // Calculate summary
    const items = await PayrollItem.findAll({ where: { payroll_run_id: run_id } });
    const summary = items.reduce((acc, item) => {
      acc.total_employees++;
      acc.total_gross += parseFloat(item.gross_salary) || 0;
      acc.total_net += parseFloat(item.net_salary) || 0;
      acc.total_deductions += parseFloat(item.total_deductions) || 0;
      acc.total_pf += parseFloat(item.epf_employee) || 0;
      acc.total_esic += parseFloat(item.esic_employee) || 0;
      acc.total_tds += parseFloat(item.tds) || 0;
      return acc;
    }, {
      total_employees: 0, total_gross: 0, total_net: 0,
      total_deductions: 0, total_pf: 0, total_esic: 0, total_tds: 0
    });

    res.json({ run, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRunItems = async (req, res) => {
  try {
    const { run_id } = req.params;
    const company_id = req.user.company_id;

    const run = await PayrollRun.findOne({ where: { id: run_id, company_id } });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });

    const items = await PayrollItem.findAll({
      where: { payroll_run_id: run_id },
      include: [{
        model: Employee,
        attributes: ['id', 'emp_id', 'first_name', 'last_name', 'bank_account_no', 'bank_ifsc', 'bank_name'],
        include: [
          { model: Department, attributes: ['id', 'name'] },
          { model: Designation, attributes: ['id', 'name'] }
        ]
      }],
      order: [[Employee, 'first_name', 'ASC']]
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSlip = async (req, res) => {
  try {
    const { payroll_item_id } = req.params;
    const company_id = req.user.company_id;

    const item = await PayrollItem.findOne({
      where: { id: payroll_item_id },
      include: [
        {
          model: PayrollRun,
          where: { company_id },
          attributes: ['id', 'month', 'year', 'status']
        },
        {
          model: Employee,
          attributes: ['id', 'emp_id', 'first_name', 'last_name', 'pan_number', 'uan_number', 'bank_account_no', 'bank_ifsc'],
          include: [
            { model: Department, attributes: ['id', 'name'] },
            { model: Designation, attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    if (!item) return res.status(404).json({ error: 'Payslip not found' });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSlipPDF = async (req, res) => {
  try {
    const { payroll_item_id } = req.params;
    const company_id = req.user.company_id;

    const item = await PayrollItem.findOne({
      where: { id: payroll_item_id },
      include: [
        {
          model: PayrollRun,
          where: { company_id },
          attributes: ['id', 'month', 'year', 'status']
        },
        {
          model: Employee,
          attributes: ['id', 'emp_id', 'first_name', 'last_name', 'pan_number', 'uan_number', 'bank_account_no', 'bank_ifsc'],
          include: [
            { model: Department, attributes: ['id', 'name'] },
            { model: Designation, attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    if (!item) return res.status(404).json({ error: 'Payslip not found' });

    const company = await Company.findByPk(company_id);
    const payrollRun = item.PayrollRun;
    const employee = item.Employee;

    const pdfBuffer = await generateSalarySlip(item, employee, company);

    const monthName = new Date(payrollRun.year, payrollRun.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const filename = `salary_slip_${employee.emp_id}_${payrollRun.month}_${payrollRun.year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Generate slip PDF error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.lockRun = async (req, res) => {
  try {
    const { run_id } = req.params;
    const company_id = req.user.company_id;

    const run = await PayrollRun.findOne({ where: { id: run_id, company_id } });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (run.status === 'locked') return res.status(400).json({ error: 'Payroll run is already locked' });
    if (run.status === 'draft') return res.status(400).json({ error: 'Process payroll before locking' });

    await run.update({ status: 'locked' });
    res.json({ message: 'Payroll run locked', run });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployeeSlip = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { month, year } = req.query;
    const company_id = req.user.company_id;

    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const item = await PayrollItem.findOne({
      include: [{
        model: PayrollRun,
        where: { company_id, month: parseInt(month), year: parseInt(year) },
        attributes: ['id', 'month', 'year', 'status']
      }],
      where: { employee_id }
    });

    if (!item) return res.status(404).json({ error: 'Payslip not found for this month' });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
