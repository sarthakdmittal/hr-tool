const { ResignationLetter, Employee, Department, Designation, Company } = require('../models');
const { generateResignationLetter } = require('../services/pdfService');

exports.listResignations = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const resignations = await ResignationLetter.findAll({
      where: { company_id },
      include: [{
        model: Employee,
        attributes: ['id', 'emp_id', 'first_name', 'last_name'],
        include: [
          { model: Department, attributes: ['id', 'name'] },
          { model: Designation, attributes: ['id', 'name'] }
        ]
      }],
      order: [['resignation_date', 'DESC']]
    });
    res.json(resignations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createResignation = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { employee_id, resignation_date, last_working_date, reason, notice_period_waived } = req.body;

    if (!employee_id || !resignation_date || !last_working_date) {
      return res.status(400).json({ error: 'employee_id, resignation_date, and last_working_date are required' });
    }

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const resignation = await ResignationLetter.create({
      company_id, employee_id, resignation_date, last_working_date,
      reason, notice_period_waived: !!notice_period_waived,
      generated_by: req.user.id
    });

    res.status(201).json({ message: 'Resignation letter created', resignation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const { status, hr_notes } = req.body;

    const resignation = await ResignationLetter.findOne({ where: { id, company_id } });
    if (!resignation) return res.status(404).json({ error: 'Resignation not found' });

    await resignation.update({ status, hr_notes });
    res.json({ message: 'Status updated', resignation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteResignation = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const resignation = await ResignationLetter.findOne({ where: { id, company_id } });
    if (!resignation) return res.status(404).json({ error: 'Resignation not found' });

    await resignation.destroy();
    res.json({ message: 'Resignation letter deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getResignationPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const resignation = await ResignationLetter.findOne({ where: { id, company_id } });
    if (!resignation) return res.status(404).json({ error: 'Resignation not found' });

    const company = await Company.findByPk(company_id);
    const employee = await Employee.findOne({
      where: { id: resignation.employee_id, company_id },
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: Designation, attributes: ['id', 'name'] }
      ]
    });

    const pdfBuffer = await generateResignationLetter(resignation, employee, company);
    const safeName = `${employee.first_name}_${employee.last_name}`.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `resignation_${safeName}_${resignation.resignation_date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
