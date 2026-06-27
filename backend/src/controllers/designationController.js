const { Designation, Department } = require('../models');

exports.listDesignations = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { department_id } = req.query;

    const where = { company_id };
    if (department_id) where.department_id = department_id;

    const designations = await Designation.findAll({
      where,
      include: [{ model: Department, attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });
    res.json(designations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createDesignation = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { name, department_id, description, grade } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const designation = await Designation.create({ company_id, name, department_id, description, grade });
    res.status(201).json(designation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const designation = await Designation.findOne({
      where: { id, company_id },
      include: [{ model: Department, attributes: ['id', 'name'] }]
    });
    if (!designation) return res.status(404).json({ error: 'Designation not found' });

    res.json(designation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const designation = await Designation.findOne({ where: { id, company_id } });
    if (!designation) return res.status(404).json({ error: 'Designation not found' });

    const { name, department_id, description, grade } = req.body;
    await designation.update({ name, department_id, description, grade });

    res.json({ message: 'Designation updated', designation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const designation = await Designation.findOne({ where: { id, company_id } });
    if (!designation) return res.status(404).json({ error: 'Designation not found' });

    await designation.destroy();
    res.json({ message: 'Designation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
