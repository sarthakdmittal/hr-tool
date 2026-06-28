const { Company } = require('../models');

exports.getCompany = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    if (!company_id) {
      return res.status(404).json({ error: 'No company associated with this account' });
    }

    const company = await Company.findByPk(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const data = company.toJSON();
    // Alias DB column names to frontend field names
    data.pan_number = data.pan;
    data.tan_number = data.tan;
    data.epf_number = data.pf_number;
    data.working_days = data.working_days_per_month;
    res.json(data);
  } catch (err) {
    console.error('Get company error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    if (!company_id) {
      return res.status(404).json({ error: 'No company associated with this account' });
    }

    const company = await Company.findByPk(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const b = req.body;
    const pick = (val, fallback) => val !== undefined ? (val || null) : fallback;

    await company.update({
      name:                   b.name || company.name,
      logo:                   pick(b.logo, company.logo),
      address:                pick(b.address, company.address),
      city:                   pick(b.city, company.city),
      state:                  pick(b.state, company.state),
      pincode:                pick(b.pincode, company.pincode),
      phone:                  pick(b.phone, company.phone),
      email:                  pick(b.email, company.email),
      website:                pick(b.website, company.website),
      industry:               pick(b.industry, company.industry),
      founded_year:           b.founded_year !== undefined ? (parseInt(b.founded_year) || null) : company.founded_year,
      pan:                    pick(b.pan_number ?? b.pan, company.pan),
      tan:                    pick(b.tan_number ?? b.tan, company.tan),
      cin:                    pick(b.cin, company.cin),
      gstin:                  pick(b.gstin, company.gstin),
      pf_number:              pick(b.epf_number ?? b.pf_number, company.pf_number),
      esic_number:            pick(b.esic_number, company.esic_number),
      pt_number:              pick(b.pt_number, company.pt_number),
      lwf_number:             pick(b.lwf_number, company.lwf_number),
      incorporation_date:     pick(b.incorporation_date, company.incorporation_date),
      payroll_day:            b.payroll_day !== undefined ? (parseInt(b.payroll_day) || null) : company.payroll_day,
      working_days_per_month: b.working_days !== undefined ? (parseInt(b.working_days) || null) : company.working_days_per_month,
      epf_employer_rate:      b.epf_employer_rate !== undefined ? (parseFloat(b.epf_employer_rate) || null) : company.epf_employer_rate,
      epf_employee_rate:      b.epf_employee_rate !== undefined ? (parseFloat(b.epf_employee_rate) || null) : company.epf_employee_rate,
      esic_employer_rate:     b.esic_employer_rate !== undefined ? (parseFloat(b.esic_employer_rate) || null) : company.esic_employer_rate,
      esic_employee_rate:     b.esic_employee_rate !== undefined ? (parseFloat(b.esic_employee_rate) || null) : company.esic_employee_rate,
      epf_ceiling:            b.epf_ceiling !== undefined ? (parseInt(b.epf_ceiling) || null) : company.epf_ceiling,
      esic_ceiling:           b.esic_ceiling !== undefined ? (parseInt(b.esic_ceiling) || null) : company.esic_ceiling,
    });

    res.json({ message: 'Company updated successfully', company });
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: err.message });
  }
};
