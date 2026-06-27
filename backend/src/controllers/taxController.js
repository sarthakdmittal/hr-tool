const { TaxDeclaration, Employee } = require('../models');

exports.getTaxDeclaration = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const company_id = req.user.company_id;
    const { financial_year } = req.query;

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const fy = financial_year || (currentMonth >= 4
      ? `${currentYear}-${String(currentYear + 1).slice(2)}`
      : `${currentYear - 1}-${String(currentYear).slice(2)}`);

    const declaration = await TaxDeclaration.findOne({
      where: { employee_id, financial_year: fy }
    });

    if (!declaration) {
      return res.status(404).json({ error: 'No tax declaration found for this employee and financial year' });
    }

    res.json(declaration);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createOrUpdateDeclaration = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const {
      employee_id, financial_year, regime,
      investments_80c, hra_rent_paid, section_80d, section_80e,
      section_80g, section_80tta, home_loan_interest, other_deductions, nps_80ccd
    } = req.body;

    if (!employee_id || !financial_year) {
      return res.status(400).json({ error: 'employee_id and financial_year are required' });
    }

    const employee = await Employee.findOne({ where: { id: employee_id, company_id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const [declaration, created] = await TaxDeclaration.findOrCreate({
      where: { employee_id, financial_year },
      defaults: {
        regime: regime || 'new',
        investments_80c: investments_80c || 0,
        hra_rent_paid: hra_rent_paid || 0,
        section_80d: section_80d || 0,
        section_80e: section_80e || 0,
        section_80g: section_80g || 0,
        section_80tta: section_80tta || 0,
        home_loan_interest: home_loan_interest || 0,
        other_deductions: other_deductions || 0,
        nps_80ccd: nps_80ccd || 0
      }
    });

    if (!created) {
      if (declaration.is_finalized) {
        return res.status(400).json({ error: 'Tax declaration is finalized and cannot be modified' });
      }
      await declaration.update({
        regime: regime !== undefined ? regime : declaration.regime,
        investments_80c: investments_80c !== undefined ? investments_80c : declaration.investments_80c,
        hra_rent_paid: hra_rent_paid !== undefined ? hra_rent_paid : declaration.hra_rent_paid,
        section_80d: section_80d !== undefined ? section_80d : declaration.section_80d,
        section_80e: section_80e !== undefined ? section_80e : declaration.section_80e,
        section_80g: section_80g !== undefined ? section_80g : declaration.section_80g,
        section_80tta: section_80tta !== undefined ? section_80tta : declaration.section_80tta,
        home_loan_interest: home_loan_interest !== undefined ? home_loan_interest : declaration.home_loan_interest,
        other_deductions: other_deductions !== undefined ? other_deductions : declaration.other_deductions,
        nps_80ccd: nps_80ccd !== undefined ? nps_80ccd : declaration.nps_80ccd
      });
    }

    res.status(created ? 201 : 200).json({
      message: created ? 'Tax declaration created' : 'Tax declaration updated',
      declaration
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const declaration = await TaxDeclaration.findOne({
      where: { id },
      include: [{ model: Employee, where: { company_id } }]
    });
    if (!declaration) return res.status(404).json({ error: 'Tax declaration not found' });
    if (declaration.is_finalized) {
      return res.status(400).json({ error: 'Tax declaration is finalized and cannot be modified' });
    }

    const {
      regime, investments_80c, hra_rent_paid, section_80d, section_80e,
      section_80g, section_80tta, home_loan_interest, other_deductions, nps_80ccd, is_finalized
    } = req.body;

    await declaration.update({
      regime: regime !== undefined ? regime : declaration.regime,
      investments_80c: investments_80c !== undefined ? investments_80c : declaration.investments_80c,
      hra_rent_paid: hra_rent_paid !== undefined ? hra_rent_paid : declaration.hra_rent_paid,
      section_80d: section_80d !== undefined ? section_80d : declaration.section_80d,
      section_80e: section_80e !== undefined ? section_80e : declaration.section_80e,
      section_80g: section_80g !== undefined ? section_80g : declaration.section_80g,
      section_80tta: section_80tta !== undefined ? section_80tta : declaration.section_80tta,
      home_loan_interest: home_loan_interest !== undefined ? home_loan_interest : declaration.home_loan_interest,
      other_deductions: other_deductions !== undefined ? other_deductions : declaration.other_deductions,
      nps_80ccd: nps_80ccd !== undefined ? nps_80ccd : declaration.nps_80ccd,
      is_finalized: is_finalized !== undefined ? is_finalized : declaration.is_finalized
    });

    res.json({ message: 'Tax declaration updated', declaration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
