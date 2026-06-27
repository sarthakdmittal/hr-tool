const { SalaryStructure, SalaryComponent, Employee, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.listStructures = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const structures = await SalaryStructure.findAll({
      where: { company_id },
      order: [['name', 'ASC']]
    });

    const ids = structures.map((s) => s.id);
    if (ids.length === 0) return res.json([]);

    const [empCounts, compCounts] = await Promise.all([
      Employee.findAll({
        where: { company_id, salary_structure_id: { [Op.in]: ids } },
        attributes: ['salary_structure_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        group: ['salary_structure_id'],
        raw: true,
      }),
      SalaryComponent.findAll({
        where: { structure_id: { [Op.in]: ids } },
        attributes: ['structure_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        group: ['structure_id'],
        raw: true,
      }),
    ]);

    const empMap = Object.fromEntries(empCounts.map((r) => [r.salary_structure_id, parseInt(r.cnt, 10)]));
    const compMap = Object.fromEntries(compCounts.map((r) => [r.structure_id, parseInt(r.cnt, 10)]));

    res.json(structures.map((s) => ({
      ...s.toJSON(),
      employee_count: empMap[s.id] || 0,
      components_count: compMap[s.id] || 0,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createStructure = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const structure = await SalaryStructure.create({ company_id, name, description });
    res.status(201).json(structure);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const structure = await SalaryStructure.findOne({
      where: { id, company_id },
      include: [{ model: SalaryComponent, as: 'components', where: { is_active: true }, required: false }]
    });

    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });

    res.json(structure);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const structure = await SalaryStructure.findOne({ where: { id, company_id } });
    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });

    const { name, description, is_active } = req.body;
    await structure.update({ name, description, is_active });

    res.json({ message: 'Structure updated', structure });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const structure = await SalaryStructure.findOne({ where: { id, company_id } });
    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });

    await structure.destroy();
    res.json({ message: 'Structure deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listComponents = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const structure = await SalaryStructure.findOne({ where: { id, company_id } });
    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });

    const components = await SalaryComponent.findAll({
      where: { structure_id: id },
      order: [['sequence_order', 'ASC'], ['type', 'ASC']]
    });

    res.json(components);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addComponent = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const structure = await SalaryStructure.findOne({ where: { id, company_id } });
    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });

    const { name, code, type, calculation_type, value, taxable, sequence_order } = req.body;

    if (!name || !type || !calculation_type || value === undefined) {
      return res.status(400).json({ error: 'name, type, calculation_type, and value are required' });
    }

    const component = await SalaryComponent.create({
      structure_id: id, name, code, type, calculation_type, value, taxable, sequence_order
    });

    res.status(201).json(component);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateComponent = async (req, res) => {
  try {
    const { id, comp_id } = req.params;
    const company_id = req.user.company_id;

    const structure = await SalaryStructure.findOne({ where: { id, company_id } });
    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });

    const component = await SalaryComponent.findOne({ where: { id: comp_id, structure_id: id } });
    if (!component) return res.status(404).json({ error: 'Component not found' });

    const { name, code, type, calculation_type, value, taxable, sequence_order, is_active } = req.body;
    await component.update({ name, code, type, calculation_type, value, taxable, sequence_order, is_active });

    res.json({ message: 'Component updated', component });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteComponent = async (req, res) => {
  try {
    const { id, comp_id } = req.params;
    const company_id = req.user.company_id;

    const structure = await SalaryStructure.findOne({ where: { id, company_id } });
    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });

    const component = await SalaryComponent.findOne({ where: { id: comp_id, structure_id: id } });
    if (!component) return res.status(404).json({ error: 'Component not found' });

    await component.destroy();
    res.json({ message: 'Component deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
