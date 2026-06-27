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

    res.json(company);
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

    const {
      name, logo, address, city, state, pincode, phone, email,
      website, pan, tan, cin, pf_number, esic_number, pt_number, incorporation_date
    } = req.body;

    await company.update({
      name: name || company.name,
      logo: logo !== undefined ? logo : company.logo,
      address: address !== undefined ? address : company.address,
      city: city !== undefined ? city : company.city,
      state: state !== undefined ? state : company.state,
      pincode: pincode !== undefined ? pincode : company.pincode,
      phone: phone !== undefined ? phone : company.phone,
      email: email !== undefined ? email : company.email,
      website: website !== undefined ? website : company.website,
      pan: pan !== undefined ? pan : company.pan,
      tan: tan !== undefined ? tan : company.tan,
      cin: cin !== undefined ? cin : company.cin,
      pf_number: pf_number !== undefined ? pf_number : company.pf_number,
      esic_number: esic_number !== undefined ? esic_number : company.esic_number,
      pt_number: pt_number !== undefined ? pt_number : company.pt_number,
      incorporation_date: incorporation_date !== undefined ? incorporation_date : company.incorporation_date
    });

    res.json({ message: 'Company updated successfully', company });
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: err.message });
  }
};
