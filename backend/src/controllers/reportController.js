const { Employee, Department, Designation, PayrollItem, PayrollRun, TaxDeclaration, Company } = require('../models');
const { Op } = require('sequelize');
const { calculateAnnualTax, calculateTaxableIncome } = require('../services/taxService');
const { generateSalarySlip } = require('../services/pdfService');
const PDFDocument = require('pdfkit');

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

exports.getPFReport = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { month, year } = req.query;

    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const run = await PayrollRun.findOne({ where: { company_id, month: parseInt(month), year: parseInt(year) } });
    if (!run) return res.status(404).json({ error: 'Payroll not processed for this month' });

    const items = await PayrollItem.findAll({
      where: { payroll_run_id: run.id },
      include: [{
        model: Employee,
        attributes: ['id', 'emp_id', 'first_name', 'last_name', 'uan_number'],
        include: [{ model: Department, attributes: ['id', 'name'] }]
      }]
    });

    const pfData = items.map(item => ({
      employee_id: item.employee_id,
      emp_id: item.Employee.emp_id,
      name: `${item.Employee.first_name} ${item.Employee.last_name}`,
      department: item.Employee.Department ? item.Employee.Department.name : '',
      uan_number: item.Employee.uan_number,
      basic_salary: parseFloat(item.basic_salary),
      epf_employee: parseFloat(item.epf_employee),
      epf_employer: parseFloat(item.epf_employer),
      eps_employer: parseFloat(item.eps_employer),
      total_pf: parseFloat(item.epf_employee) + parseFloat(item.epf_employer)
    }));

    const summary = pfData.reduce((acc, d) => {
      acc.total_employee_pf += d.epf_employee;
      acc.total_employer_pf += d.epf_employer;
      acc.total_eps += d.eps_employer;
      acc.total_challan += d.epf_employee + d.epf_employer;
      return acc;
    }, { total_employee_pf: 0, total_employer_pf: 0, total_eps: 0, total_challan: 0 });

    res.json({ month: parseInt(month), year: parseInt(year), summary, data: pfData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPFECR = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { month, year } = req.query;

    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const run = await PayrollRun.findOne({ where: { company_id, month: parseInt(month), year: parseInt(year) } });
    if (!run) return res.status(404).json({ error: 'Payroll not processed for this month' });

    const items = await PayrollItem.findAll({
      where: { payroll_run_id: run.id },
      include: [{
        model: Employee,
        attributes: ['id', 'emp_id', 'first_name', 'last_name', 'uan_number']
      }]
    });

    // ECR format: UAN, Member Name, Gross Wages, EPF Wages, EPS Wages, Employee PF, Employer PF, EPS, NCP Days, Refund of Advances
    const headers = ['UAN', 'Member Name', 'Gross Wages', 'EPF Wages', 'EPS Wages', 'Employee PF', 'Employer PF', 'EPS', 'NCP Days', 'Refund of Advances'];
    const rows = items.map(item => {
      const epfWages = Math.min(parseFloat(item.basic_salary), 15000);
      return [
        item.Employee.uan_number || '',
        `${item.Employee.first_name} ${item.Employee.last_name}`,
        parseFloat(item.gross_salary).toFixed(2),
        epfWages.toFixed(2),
        epfWages.toFixed(2),
        parseFloat(item.epf_employee).toFixed(2),
        parseFloat(item.epf_employer).toFixed(2),
        parseFloat(item.eps_employer).toFixed(2),
        parseFloat(item.lop_days).toFixed(0),
        '0.00'
      ];
    });

    let csv = headers.join(',') + '\n';
    rows.forEach(row => { csv += row.join(',') + '\n'; });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="PF_ECR_${month}_${year}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getESICReport = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { month, year } = req.query;

    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const run = await PayrollRun.findOne({ where: { company_id, month: parseInt(month), year: parseInt(year) } });
    if (!run) return res.status(404).json({ error: 'Payroll not processed for this month' });

    const items = await PayrollItem.findAll({
      where: {
        payroll_run_id: run.id,
        esic_employee: { [Op.gt]: 0 }
      },
      include: [{
        model: Employee,
        attributes: ['id', 'emp_id', 'first_name', 'last_name', 'esic_number']
      }]
    });

    const esicData = items.map(item => ({
      employee_id: item.employee_id,
      emp_id: item.Employee.emp_id,
      name: `${item.Employee.first_name} ${item.Employee.last_name}`,
      esic_number: item.Employee.esic_number,
      gross_salary: parseFloat(item.gross_salary),
      esic_employee: parseFloat(item.esic_employee),
      esic_employer: parseFloat(item.esic_employer),
      total_esic: parseFloat(item.esic_employee) + parseFloat(item.esic_employer)
    }));

    const summary = esicData.reduce((acc, d) => {
      acc.total_employee_esic += d.esic_employee;
      acc.total_employer_esic += d.esic_employer;
      acc.total_challan += d.total_esic;
      return acc;
    }, { total_employee_esic: 0, total_employer_esic: 0, total_challan: 0 });

    res.json({ month: parseInt(month), year: parseInt(year), summary, data: esicData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTDSReport = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { month, year } = req.query;

    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const run = await PayrollRun.findOne({ where: { company_id, month: parseInt(month), year: parseInt(year) } });
    if (!run) return res.status(404).json({ error: 'Payroll not processed for this month' });

    const items = await PayrollItem.findAll({
      where: { payroll_run_id: run.id },
      include: [{
        model: Employee,
        attributes: ['id', 'emp_id', 'first_name', 'last_name', 'pan_number']
      }]
    });

    const tdsData = items
      .filter(item => parseFloat(item.tds) > 0)
      .map(item => ({
        employee_id: item.employee_id,
        emp_id: item.Employee.emp_id,
        name: `${item.Employee.first_name} ${item.Employee.last_name}`,
        pan_number: item.Employee.pan_number,
        gross_salary: parseFloat(item.gross_salary),
        tds: parseFloat(item.tds)
      }));

    const totalTDS = tdsData.reduce((sum, d) => sum + d.tds, 0);

    res.json({ month: parseInt(month), year: parseInt(year), total_tds: totalTDS, data: tdsData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSalarySummary = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { month, year } = req.query;

    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const run = await PayrollRun.findOne({ where: { company_id, month: parseInt(month), year: parseInt(year) } });
    if (!run) return res.status(404).json({ error: 'Payroll not processed for this month' });

    const items = await PayrollItem.findAll({
      where: { payroll_run_id: run.id },
      include: [{
        model: Employee,
        include: [{ model: Department, attributes: ['id', 'name'] }]
      }]
    });

    const departmentSummary = {};
    let overallSummary = {
      total_employees: 0, total_gross: 0, total_net: 0,
      total_deductions: 0, total_pf: 0, total_esic: 0, total_tds: 0, total_pt: 0
    };

    for (const item of items) {
      const deptName = item.Employee?.Department?.name || 'Unassigned';

      if (!departmentSummary[deptName]) {
        departmentSummary[deptName] = {
          employees: 0, total_gross: 0, total_net: 0, total_deductions: 0
        };
      }

      departmentSummary[deptName].employees++;
      departmentSummary[deptName].total_gross += parseFloat(item.gross_salary);
      departmentSummary[deptName].total_net += parseFloat(item.net_salary);
      departmentSummary[deptName].total_deductions += parseFloat(item.total_deductions);

      overallSummary.total_employees++;
      overallSummary.total_gross += parseFloat(item.gross_salary);
      overallSummary.total_net += parseFloat(item.net_salary);
      overallSummary.total_deductions += parseFloat(item.total_deductions);
      overallSummary.total_pf += parseFloat(item.epf_employee);
      overallSummary.total_esic += parseFloat(item.esic_employee);
      overallSummary.total_tds += parseFloat(item.tds);
      overallSummary.total_pt += parseFloat(item.professional_tax);
    }

    res.json({
      month: parseInt(month), year: parseInt(year),
      overall: overallSummary,
      by_department: departmentSummary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getForm16Data = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const company_id = req.user.company_id;
    const financial_year = req.query.financial_year || `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`;

    const employee = await Employee.findOne({
      where: { id: employee_id, company_id },
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: Designation, attributes: ['id', 'name'] }
      ]
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const company = await Company.findByPk(company_id);

    // Parse financial year (e.g., "2024-25" means April 2024 to March 2025)
    const fyStartYear = parseInt(financial_year.split('-')[0]);
    const fyEndYear = fyStartYear + 1;

    // Get payroll items for the financial year (April to March)
    const payrollItems = await PayrollItem.findAll({
      include: [{
        model: PayrollRun,
        where: {
          company_id,
          [Op.or]: [
            { year: fyStartYear, month: { [Op.gte]: 4 } },
            { year: fyEndYear, month: { [Op.lte]: 3 } }
          ]
        },
        attributes: ['id', 'month', 'year']
      }],
      where: { employee_id }
    });

    const taxDeclaration = await TaxDeclaration.findOne({
      where: { employee_id, financial_year }
    });

    // Calculate totals
    const totals = payrollItems.reduce((acc, item) => {
      acc.gross_salary += parseFloat(item.gross_salary);
      acc.basic_salary += parseFloat(item.basic_salary);
      acc.hra += parseFloat(item.hra);
      acc.epf_employee += parseFloat(item.epf_employee);
      acc.professional_tax += parseFloat(item.professional_tax);
      acc.tds += parseFloat(item.tds);
      acc.net_salary += parseFloat(item.net_salary);
      return acc;
    }, {
      gross_salary: 0, basic_salary: 0, hra: 0,
      epf_employee: 0, professional_tax: 0, tds: 0, net_salary: 0
    });

    const standardDeduction = 75000;
    const taxableIncome = calculateTaxableIncome(employee, totals.gross_salary, taxDeclaration);
    const regime = taxDeclaration ? taxDeclaration.regime : 'new';
    const annualTax = calculateAnnualTax(taxableIncome, regime);

    res.json({
      financial_year,
      employee: {
        id: employee.id,
        emp_id: employee.emp_id,
        name: `${employee.first_name} ${employee.last_name}`,
        pan_number: employee.pan_number,
        designation: employee.Designation?.name,
        department: employee.Department?.name
      },
      company: {
        name: company.name,
        address: company.address,
        tan: company.tan,
        pan: company.pan
      },
      income_details: totals,
      deductions: {
        standard_deduction: standardDeduction,
        hra_exemption: 0, // Simplified
        investments_80c: taxDeclaration ? Math.min(parseFloat(taxDeclaration.investments_80c) || 0, 150000) : 0,
        section_80d: taxDeclaration ? parseFloat(taxDeclaration.section_80d) || 0 : 0,
        nps_80ccd: taxDeclaration ? Math.min(parseFloat(taxDeclaration.nps_80ccd) || 0, 50000) : 0
      },
      tax_computation: {
        gross_income: totals.gross_salary,
        taxable_income: taxableIncome,
        tax_regime: regime,
        income_tax: annualTax,
        tds_deducted: totals.tds
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getForm16PDF = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const company_id = req.user.company_id;
    const financial_year = req.query.financial_year || `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`;

    // Get the data first (reuse logic)
    const employee = await Employee.findOne({
      where: { id: employee_id, company_id },
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: Designation, attributes: ['id', 'name'] }
      ]
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const company = await Company.findByPk(company_id);
    const fyStartYear = parseInt(financial_year.split('-')[0]);
    const fyEndYear = fyStartYear + 1;

    const payrollItems = await PayrollItem.findAll({
      include: [{
        model: PayrollRun,
        where: {
          company_id,
          [Op.or]: [
            { year: fyStartYear, month: { [Op.gte]: 4 } },
            { year: fyEndYear, month: { [Op.lte]: 3 } }
          ]
        },
        attributes: ['id', 'month', 'year']
      }],
      where: { employee_id }
    });

    const taxDeclaration = await TaxDeclaration.findOne({ where: { employee_id, financial_year } });

    const totals = payrollItems.reduce((acc, item) => {
      acc.gross_salary += parseFloat(item.gross_salary);
      acc.tds += parseFloat(item.tds);
      acc.epf_employee += parseFloat(item.epf_employee);
      acc.professional_tax += parseFloat(item.professional_tax);
      return acc;
    }, { gross_salary: 0, tds: 0, epf_employee: 0, professional_tax: 0 });

    const regime = taxDeclaration ? taxDeclaration.regime : 'new';
    const taxableIncome = calculateTaxableIncome(employee, totals.gross_salary, taxDeclaration);
    const annualTax = calculateAnnualTax(taxableIncome, regime);

    // Generate Form 16 PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));

    const pdfReady = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });

    const pageWidth = doc.page.width - 100;
    const leftMargin = 50;

    doc.fontSize(16).font('Helvetica-Bold').text('FORM 16', leftMargin, 50, { align: 'center', width: pageWidth });
    doc.fontSize(11).font('Helvetica').text('Certificate of Tax Deducted at Source on Salary', leftMargin, 75, { align: 'center', width: pageWidth });
    doc.fontSize(10).font('Helvetica').text(`[Under Section 203 of Income-Tax Act, 1961]`, leftMargin, 92, { align: 'center', width: pageWidth });
    doc.moveDown(1);
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text(`Financial Year: ${financial_year}`, leftMargin, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('Employer Details:', leftMargin, doc.y);
    doc.font('Helvetica').text(`Name: ${company.name}`, leftMargin + 10, doc.y);
    doc.text(`Address: ${company.address || '-'}`, leftMargin + 10, doc.y);
    doc.text(`TAN: ${company.tan || '-'}  |  PAN: ${company.pan || '-'}`, leftMargin + 10, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('Employee Details:', leftMargin, doc.y);
    doc.font('Helvetica').text(`Name: ${employee.first_name} ${employee.last_name}`, leftMargin + 10, doc.y);
    doc.text(`Employee ID: ${employee.emp_id}`, leftMargin + 10, doc.y);
    doc.text(`PAN: ${employee.pan_number || '-'}`, leftMargin + 10, doc.y);
    doc.text(`Designation: ${employee.Designation?.name || '-'}`, leftMargin + 10, doc.y);
    doc.moveDown(0.5);

    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('Income Details:', leftMargin, doc.y);
    doc.font('Helvetica').text(`Gross Salary: ₹ ${formatCurrency(totals.gross_salary)}`, leftMargin + 10, doc.y);
    doc.text(`Standard Deduction: ₹ 75,000.00`, leftMargin + 10, doc.y);
    doc.text(`Taxable Income: ₹ ${formatCurrency(taxableIncome)}`, leftMargin + 10, doc.y);
    doc.text(`Tax Regime: ${regime.toUpperCase()} REGIME`, leftMargin + 10, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('Tax Computation:', leftMargin, doc.y);
    doc.font('Helvetica').text(`Income Tax: ₹ ${formatCurrency(annualTax)}`, leftMargin + 10, doc.y);
    doc.text(`TDS Deducted: ₹ ${formatCurrency(totals.tds)}`, leftMargin + 10, doc.y);
    doc.moveDown(1);

    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica').fillColor('#666666').text(
      'This is a computer generated Form 16 and is subject to verification.',
      leftMargin, doc.y, { align: 'center', width: pageWidth }
    );

    doc.end();
    const pdfBuffer = await pdfReady;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Form16_${employee.emp_id}_${financial_year}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Form 16 PDF error:', err);
    res.status(500).json({ error: err.message });
  }
};
