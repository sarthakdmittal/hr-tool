const { SalaryStructure, SalaryComponent, Employee, sequelize } = require('../models');
const { Op } = require('sequelize');

const TYPE_MAP = {
  pct_ctc: 'percentage_of_ctc',
  pct_basic: 'percentage_of_basic',
  pct_gross: 'percentage_of_gross',
  fixed: 'fixed',
  special_balance: 'special_balance',
};
const REVERSE_TYPE_MAP = Object.fromEntries(Object.entries(TYPE_MAP).map(([k, v]) => [v, k]));

async function saveComponents(structure_id, earnings = [], deductions = []) {
  await SalaryComponent.destroy({ where: { structure_id } });
  const rows = [];
  earnings.forEach((e, i) => rows.push({
    structure_id,
    name: e.name,
    code: e.code || e.name.toUpperCase().replace(/\s+/g, '_'),
    type: 'earning',
    calculation_type: TYPE_MAP[e.type] || e.type || 'fixed',
    value: parseFloat(e.value) || 0,
    taxable: e.taxable !== false,
    sequence_order: i + 1,
    is_active: true,
  }));
  deductions.forEach((d, i) => rows.push({
    structure_id,
    name: d.name,
    code: d.code || d.name.toUpperCase().replace(/\s+/g, '_'),
    type: 'deduction',
    calculation_type: TYPE_MAP[d.type] || d.type || 'fixed',
    value: parseFloat(d.value) || 0,
    taxable: d.taxable !== false,
    sequence_order: i + 1,
    is_active: true,
  }));
  if (rows.length) await SalaryComponent.bulkCreate(rows);
}

function formatStructureResponse(structure) {
  const result = structure.toJSON ? structure.toJSON() : { ...structure };
  const components = result.components || [];
  result.earnings = components
    .filter((c) => c.type === 'earning')
    .sort((a, b) => a.sequence_order - b.sequence_order)
    .map((c) => ({ name: c.name, code: c.code, type: REVERSE_TYPE_MAP[c.calculation_type] || c.calculation_type, value: parseFloat(c.value), taxable: c.taxable }));
  result.deductions = components
    .filter((c) => c.type === 'deduction')
    .sort((a, b) => a.sequence_order - b.sequence_order)
    .map((c) => ({ name: c.name, code: c.code, type: REVERSE_TYPE_MAP[c.calculation_type] || c.calculation_type, value: parseFloat(c.value), taxable: c.taxable }));
  delete result.components;
  return result;
}

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
    const { name, description, earnings, deductions } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const structure = await SalaryStructure.create({ company_id, name, description });
    await saveComponents(structure.id, earnings, deductions);
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
      include: [{ model: SalaryComponent, as: 'components', required: false }]
    });

    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });

    res.json(formatStructureResponse(structure));
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

    const { name, description, is_active, earnings, deductions } = req.body;
    await structure.update({ name, description, is_active });
    if (earnings || deductions) {
      await saveComponents(structure.id, earnings || [], deductions || []);
    }

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
