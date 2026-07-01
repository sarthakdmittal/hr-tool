const { OfferLetter, Employee, Company, Department, Designation } = require('../models');
const { generateOfferLetter } = require('../services/pdfService');

exports.generateOfferLetter = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const {
      employee_id, candidate_name, candidate_email, candidate_address,
      designation, department, joining_date, ctc, reporting_manager,
      probation_period, notice_period, ctc_breakup, additional_terms,
      offer_date, valid_till
    } = req.body;

    if (!candidate_name || !designation || !department || !joining_date || !ctc) {
      return res.status(400).json({ error: 'candidate_name, designation, department, joining_date, and ctc are required' });
    }

    const offerLetter = await OfferLetter.create({
      company_id,
      employee_id: employee_id || null,
      candidate_name,
      candidate_email,
      candidate_address,
      designation,
      department,
      joining_date,
      ctc,
      reporting_manager,
      probation_period: probation_period || 6,
      notice_period: notice_period || 2,
      ctc_breakup: ctc_breakup || null,
      additional_terms,
      offer_date: offer_date || new Date().toISOString().split('T')[0],
      valid_till,
      generated_by: req.user.id
    });

    res.status(201).json({ message: 'Offer letter generated', offer_letter: offerLetter });
  } catch (err) {
    console.error('Generate offer letter error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteOfferLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const offerLetter = await OfferLetter.findOne({ where: { id, company_id } });
    if (!offerLetter) return res.status(404).json({ error: 'Offer letter not found' });

    await offerLetter.destroy();
    res.json({ message: 'Offer letter deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listOfferLetters = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const offerLetters = await OfferLetter.findAll({
      where: { company_id },
      order: [['createdAt', 'DESC']]
    });
    res.json(offerLetters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOfferLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const offerLetter = await OfferLetter.findOne({ where: { id, company_id } });
    if (!offerLetter) return res.status(404).json({ error: 'Offer letter not found' });

    res.json(offerLetter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOfferLetterPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const offerLetter = await OfferLetter.findOne({ where: { id, company_id } });
    if (!offerLetter) return res.status(404).json({ error: 'Offer letter not found' });

    const company = await Company.findByPk(company_id);

    let employee = null;
    if (offerLetter.employee_id) {
      employee = await Employee.findOne({
        where: { id: offerLetter.employee_id, company_id },
        include: [
          { model: Department, attributes: ['id', 'name'] },
          { model: Designation, attributes: ['id', 'name'] }
        ]
      });
    }

    const pdfBuffer = await generateOfferLetter(offerLetter, employee, company);

    const safeName = offerLetter.candidate_name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `offer_letter_${safeName}_${offerLetter.offer_date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Offer letter PDF error:', err);
    res.status(500).json({ error: err.message });
  }
};
