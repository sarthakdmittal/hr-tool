const { calculateMonthlyTDS } = require('./taxService');

/**
 * Calculate Professional Tax based on gross monthly salary
 * @param {number} grossMonthly
 * @returns {number}
 */
function calculatePT(grossMonthly) {
  const gross = parseFloat(grossMonthly) || 0;
  if (gross <= 10000) return 0;
  if (gross <= 15000) return 110;
  return 200;
}

/**
 * Get total working days in a month (Mon-Sat = 6 days/week)
 * @param {number} month - 1-12
 * @param {number} year
 * @returns {number}
 */
function getWorkingDaysInMonth(month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 6 = Saturday - exclude Sundays but include Saturdays
    if (dayOfWeek !== 0) {
      workingDays++;
    }
  }
  return workingDays;
}

/**
 * Calculate payroll for a single employee
 * @param {Object} employee - Employee model instance with salary_structure_id and ctc
 * @param {number} month - 1-12
 * @param {number} year
 * @param {Array} attendanceRecords - Array of attendance records for the month
 * @param {Object} taxDeclaration - TaxDeclaration model instance (can be null)
 * @param {Array} components - Array of SalaryComponent objects
 * @returns {Object} Payroll breakdown
 */
function calculatePayrollForEmployee(employee, month, year, attendanceRecords, taxDeclaration, components, salaryStructure) {
  const ctc = parseFloat(employee.ctc) || 0;
  const workingDays = getWorkingDaysInMonth(month, year);

  // Step 2: Count attendance — status stored as comma-separated string e.g. "P,OT"
  // P=Present(1d), A=Absent(0/LOP), W=Weekly Off(1d), P/2=Half Day(0.5d),
  // H=Holiday(1d), OT=Overtime full day(1d extra), OT/2=Overtime half day(0.5d extra)
  let presentDays = 0;
  let weeklyOffDays = 0;
  let halfDays = 0;
  let holidayDays = 0;
  let otDays = 0;
  let otHalfDays = 0;
  let lopDays = 0;

  for (const record of attendanceRecords) {
    const codes = String(record.status || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const code of codes) {
      if (code === 'P')    presentDays++;
      else if (code === 'W')    weeklyOffDays++;
      else if (code === 'P/2')  halfDays++;
      else if (code === 'H')    holidayDays++;
      else if (code === 'OT')   otDays++;
      else if (code === 'OT/2') otHalfDays++;
      else if (code === 'A')    lopDays++;
    }
  }

  // W (Weekly Off / Sunday) is NOT added to paidDays.
  // working_days is already Mon–Sat only (excludes Sundays), so Sundays are
  // implicitly paid — adding them again would inflate salary above 100%.
  // H (Holiday on a working day) IS counted so employees aren't docked for paid holidays.
  const paidDays = presentDays + holidayDays
    + (halfDays * 0.5) + otDays + (otHalfDays * 0.5);
  const effectiveLopDays = lopDays;

  const proRate = workingDays > 0 ? paidDays / workingDays : 1;

  // Step 3: Sort components by sequence_order
  const sortedComponents = [...components].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
  const earningComponents  = sortedComponents.filter(c => c.type === 'earning'   && c.is_active !== false);
  const deductionComponents = sortedComponents.filter(c => c.type === 'deduction' && c.is_active !== false);

  // Step 4: Calculate FULL-MONTH (un-prorated) amounts first, then prorate once at the end.
  // This avoids double-prorating for components that reference other components.

  // 4a. Find full-month basic (used as base for percentage_of_basic components)
  const basicComp = earningComponents.find(c =>
    c.code === 'BASIC' || c.name.toUpperCase() === 'BASIC' || c.name.toUpperCase() === 'BASIC SALARY'
  );
  let fullMonthBasic = 0;
  if (basicComp) {
    const v = parseFloat(basicComp.value) || 0;
    if (basicComp.calculation_type === 'percentage_of_ctc') fullMonthBasic = (v / 100) * ctc / 12;
    else if (basicComp.calculation_type === 'fixed') fullMonthBasic = v;
  }

  // 4b. Calculate each earning at full-month rate — three passes:
  //   Pass 1: fixed / percentage_of_ctc / percentage_of_basic
  //   Pass 2: special_balance (CTC/12 minus all Pass-1 earnings)
  //   Pass 3: percentage_of_gross (needs full-month gross from Passes 1+2)
  const earningsMap = {};

  for (const comp of earningComponents) {
    if (comp.calculation_type === 'percentage_of_gross' || comp.calculation_type === 'special_balance') continue;
    const value = parseFloat(comp.value) || 0;
    const code  = comp.code || comp.name.toUpperCase().replace(/\s+/g, '_');
    let fullAmount = 0;
    switch (comp.calculation_type) {
      case 'percentage_of_ctc':   fullAmount = (value / 100) * ctc / 12; break;
      case 'percentage_of_basic': fullAmount = (value / 100) * fullMonthBasic; break;
      case 'fixed':               fullAmount = value; break;
      default:                    fullAmount = value;
    }
    earningsMap[code] = { name: comp.name, code, taxable: comp.taxable !== false, type: 'earning', _full: fullAmount, amount: Math.round(fullAmount * proRate * 100) / 100 };
  }

  for (const comp of earningComponents) {
    if (comp.calculation_type !== 'special_balance') continue;
    const code = comp.code || comp.name.toUpperCase().replace(/\s+/g, '_');
    const otherSum = Object.values(earningsMap).reduce((s, e) => s + e._full, 0);
    const fullAmount = Math.max(0, ctc / 12 - otherSum);
    earningsMap[code] = { name: comp.name, code, taxable: comp.taxable !== false, type: 'earning', _full: fullAmount, amount: Math.round(fullAmount * proRate * 100) / 100 };
  }

  // 4c. percentage_of_gross — uses full-month gross from passes 1+2
  const fullMonthGross = Object.values(earningsMap).reduce((s, e) => s + e._full, 0);
  for (const comp of earningComponents) {
    if (comp.calculation_type !== 'percentage_of_gross') continue;
    const code = comp.code || comp.name.toUpperCase().replace(/\s+/g, '_');
    const fullAmount = ((parseFloat(comp.value) || 0) / 100) * fullMonthGross;
    earningsMap[code] = {
      ...earningsMap[code],
      _full: fullAmount,
      amount: Math.round(fullAmount * proRate * 100) / 100
    };
  }

  // Step 5: Gross salary (prorated)
  const grossSalary = Object.values(earningsMap).reduce((s, e) => s + e.amount, 0);

  // Step 6: Statutory deductions
  // EPF uses prorated basic (actual paid basic for the month), capped at ₹15,000
  const applyEPF  = salaryStructure?.apply_epf  !== false;
  const applyESIC = salaryStructure?.apply_esic !== false;
  const applyPT   = salaryStructure?.apply_pt   !== false;

  const basicForEPF = earningsMap['BASIC']?.amount ?? 0; // EPF only on explicit Basic component
  const epfBasic = applyEPF ? Math.min(basicForEPF, 15000) : 0;
  const employeeEPF = Math.round(epfBasic * 0.12);
  const employerEPF = Math.round(epfBasic * 0.0367);
  const employerEPS = Math.round(epfBasic * 0.0833);

  // ESIC: applicable if gross <= 21000
  const employeeESIC = applyESIC && grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0;
  const employerESIC = applyESIC && grossSalary <= 21000 ? Math.round(grossSalary * 0.0325) : 0;

  // Professional Tax
  const professionalTax = applyPT ? calculatePT(grossSalary) : 0;

  // TDS
  const monthlyTDS = calculateMonthlyTDS(employee, grossSalary * 12, taxDeclaration);

  // Custom deduction components
  const deductionsMap = {};
  for (const comp of deductionComponents) {
    let amount = 0;
    const value = parseFloat(comp.value) || 0;

    switch (comp.calculation_type) {
      case 'percentage_of_ctc':
        amount = (value / 100) * ctc / 12;
        break;
      case 'percentage_of_basic':
        amount = (value / 100) * basicForEPF;
        break;
      case 'percentage_of_gross':
        amount = (value / 100) * grossSalary;
        break;
      case 'fixed':
        amount = value;
        break;
      default:
        amount = value;
    }

    amount = Math.round(amount * 100) / 100;
    const code = comp.code || comp.name.toUpperCase().replace(/\s+/g, '_');
    deductionsMap[code] = {
      name: comp.name,
      code: code,
      amount: amount,
      type: 'deduction'
    };
  }

  const customDeductionsTotal = Object.values(deductionsMap).reduce((sum, d) => sum + d.amount, 0);

  // Step 7: Total deductions
  const totalDeductions = employeeEPF + employeeESIC + professionalTax + monthlyTDS + customDeductionsTotal;

  // Step 8: Net salary
  const netSalary = grossSalary - totalDeductions;

  // Get HRA amount for slip
  const hraAmount = earningsMap['HRA'] ? earningsMap['HRA'].amount : 0;

  // Step 9: Return complete breakdown
  return {
    working_days: workingDays,
    paid_days: Math.round(paidDays * 10) / 10,
    lop_days: Math.round(effectiveLopDays * 10) / 10,
    present_days: presentDays,
    weekly_off_days: weeklyOffDays,
    half_days: halfDays,
    holiday_days: holidayDays,
    ot_days: otDays,
    ot_half_days: otHalfDays,
    gross_salary: Math.round(grossSalary * 100) / 100,
    basic_salary: Math.round(basicForEPF * 100) / 100,
    hra: Math.round(hraAmount * 100) / 100,
    epf_employee: employeeEPF,
    epf_employer: employerEPF,
    eps_employer: employerEPS,
    esic_employee: employeeESIC,
    esic_employer: employerESIC,
    professional_tax: professionalTax,
    tds: monthlyTDS,
    total_deductions: Math.round(totalDeductions * 100) / 100,
    net_salary: Math.round(netSalary * 100) / 100,
    components_json: {
      earnings: earningsMap,
      deductions: {
        ...deductionsMap,
        EPF: { name: 'Provident Fund (Employee)', code: 'EPF', amount: employeeEPF, type: 'deduction' },
        ESIC: { name: 'ESIC (Employee)', code: 'ESIC', amount: employeeESIC, type: 'deduction' },
        PT: { name: 'Professional Tax', code: 'PT', amount: professionalTax, type: 'deduction' },
        TDS: { name: 'TDS', code: 'TDS', amount: monthlyTDS, type: 'deduction' }
      },
      employer_contributions: {
        EPF: { name: 'Employer PF', code: 'EPF_ER', amount: employerEPF },
        EPS: { name: 'Employer EPS', code: 'EPS_ER', amount: employerEPS },
        ESIC: { name: 'Employer ESIC', code: 'ESIC_ER', amount: employerESIC }
      }
    }
  };
}

module.exports = {
  calculatePayrollForEmployee,
  calculatePT,
  getWorkingDaysInMonth
};
