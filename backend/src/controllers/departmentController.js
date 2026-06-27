const { Department } = require('../models');

exports.listDepartments = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const departments = await Department.findAll({
      where: { company_id },
      order: [['name', 'ASC']]
    });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const department = await Department.create({ company_id, name, description });
    res.status(201).json(department);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const department = await Department.findOne({ where: { id, company_id } });
    if (!department) return res.status(404).json({ error: 'Department not found' });

    res.json(department);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const department = await Department.findOne({ where: { id, company_id } });
    if (!department) return res.status(404).json({ error: 'Department not found' });

    const { name, description, head_of_department } = req.body;
    await department.update({ name, description, head_of_department });

    res.json({ message: 'Department updated', department });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const department = await Department.findOne({ where: { id, company_id } });
    if (!department) return res.status(404).json({ error: 'Department not found' });

    await department.destroy();
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
