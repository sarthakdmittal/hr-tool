/**
 * Indian Tax Calculation Service for FY 2025-26
 */

/**
 * Calculate annual income tax based on regime
 * @param {number} annualTaxableIncome
 * @param {string} regime - 'new' or 'old'
 * @returns {number} Annual tax amount (after cess)
 */
function calculateAnnualTax(annualTaxableIncome, regime) {
  let tax = 0;
  const income = parseFloat(annualTaxableIncome) || 0;

  if (regime === 'new') {
    // New Regime Slabs FY 2025-26
    // 0 - 4,00,000: 0%
    // 4,00,001 - 8,00,000: 5%
    // 8,00,001 - 12,00,000: 10%
    // 12,00,001 - 16,00,000: 15%
    // 16,00,001 - 20,00,000: 20%
    // 20,00,001 - 24,00,000: 25%
    // > 24,00,000: 30%
    if (income <= 400000) {
      tax = 0;
    } else if (income <= 800000) {
      tax = (income - 400000) * 0.05;
    } else if (income <= 1200000) {
      tax = (400000 * 0.05) + ((income - 800000) * 0.10);
    } else if (income <= 1600000) {
      tax = (400000 * 0.05) + (400000 * 0.10) + ((income - 1200000) * 0.15);
    } else if (income <= 2000000) {
      tax = (400000 * 0.05) + (400000 * 0.10) + (400000 * 0.15) + ((income - 1600000) * 0.20);
    } else if (income <= 2400000) {
      tax = (400000 * 0.05) + (400000 * 0.10) + (400000 * 0.15) + (400000 * 0.20) + ((income - 2000000) * 0.25);
    } else {
      tax = (400000 * 0.05) + (400000 * 0.10) + (400000 * 0.15) + (400000 * 0.20) + (400000 * 0.25) + ((income - 2400000) * 0.30);
    }

    // Rebate u/s 87A: if income <= 12,00,000, tax = 0
    if (income <= 1200000) {
      tax = 0;
    }
  } else {
    // Old Regime Slabs
    // 0 - 2,50,000: 0%
    // 2,50,001 - 5,00,000: 5%
    // 5,00,001 - 10,00,000: 20%
    // > 10,00,000: 30%
    if (income <= 250000) {
      tax = 0;
    } else if (income <= 500000) {
      tax = (income - 250000) * 0.05;
    } else if (income <= 1000000) {
      tax = (250000 * 0.05) + ((income - 500000) * 0.20);
    } else {
      tax = (250000 * 0.05) + (500000 * 0.20) + ((income - 1000000) * 0.30);
    }

    // Rebate u/s 87A: if income <= 5,00,000, tax = 0
    if (income <= 500000) {
      tax = 0;
    }
  }

  // Add 4% Health & Education Cess
  tax = tax + (tax * 0.04);

  return Math.round(tax);
}

/**
 * Calculate HRA Exemption
 * @param {number} basicSalaryAnnual - Annual basic salary
 * @param {number} hraReceived - Annual HRA received
 * @param {number} rentPaid - Annual rent paid
 * @param {boolean} isMetro - Whether employee is in metro city
 * @returns {number} HRA exemption amount
 */
function calculateHRAExemption(basicSalaryAnnual, hraReceived, rentPaid, isMetro) {
  const basic = parseFloat(basicSalaryAnnual) || 0;
  const hra = parseFloat(hraReceived) || 0;
  const rent = parseFloat(rentPaid) || 0;

  if (rent === 0) return 0;

  const metroPercent = isMetro ? 0.50 : 0.40;

  const exemption1 = hra; // Actual HRA received
  const exemption2 = metroPercent * basic; // 50%/40% of basic
  const exemption3 = rent - (0.10 * basic); // Rent paid - 10% of basic

  const exemption = Math.min(exemption1, exemption2, Math.max(0, exemption3));
  return Math.max(0, Math.round(exemption));
}

/**
 * Calculate taxable income after all deductions
 * @param {Object} employee - Employee object with is_metro, ctc fields
 * @param {number} annualGross - Annual gross salary
 * @param {Object} taxDeclaration - Tax declaration object
 * @returns {number} Taxable income
 */
function calculateTaxableIncome(employee, annualGross, taxDeclaration) {
  const gross = parseFloat(annualGross) || 0;
  const regime = taxDeclaration ? taxDeclaration.regime : 'new';

  // Standard deduction (applicable in both regimes from FY 2024-25)
  const standardDeduction = 75000; // FY 2025-26 standard deduction

  let taxableIncome = gross - standardDeduction;

  if (taxDeclaration && regime === 'old') {
    // HRA Exemption
    // Estimate basic as 40% of gross for HRA calculation if not explicitly available
    const estimatedBasicAnnual = gross * 0.40;
    // Estimate HRA received as 40%/50% of basic
    const isMetro = employee ? employee.is_metro : false;
    const estimatedHRAReceived = isMetro ? estimatedBasicAnnual * 0.50 : estimatedBasicAnnual * 0.40;
    const rentPaid = parseFloat(taxDeclaration.hra_rent_paid) || 0;

    const hraExemption = calculateHRAExemption(estimatedBasicAnnual, estimatedHRAReceived, rentPaid, isMetro);
    taxableIncome -= hraExemption;

    // 80C deductions (max 1,50,000)
    const investments80c = Math.min(parseFloat(taxDeclaration.investments_80c) || 0, 150000);
    taxableIncome -= investments80c;

    // 80D - Medical insurance
    const section80d = parseFloat(taxDeclaration.section_80d) || 0;
    taxableIncome -= section80d;

    // 80E - Education loan interest
    const section80e = parseFloat(taxDeclaration.section_80e) || 0;
    taxableIncome -= section80e;

    // 80G - Donations
    const section80g = parseFloat(taxDeclaration.section_80g) || 0;
    taxableIncome -= section80g;

    // 80TTA - Savings interest (max 10,000)
    const section80tta = Math.min(parseFloat(taxDeclaration.section_80tta) || 0, 10000);
    taxableIncome -= section80tta;

    // 24(b) - Home loan interest (max 2,00,000 for self-occupied)
    const homeLoanInterest = Math.min(parseFloat(taxDeclaration.home_loan_interest) || 0, 200000);
    taxableIncome -= homeLoanInterest;

    // NPS 80CCD(1B) - additional 50,000
    const nps80ccd = Math.min(parseFloat(taxDeclaration.nps_80ccd) || 0, 50000);
    taxableIncome -= nps80ccd;

    // Other deductions
    const otherDeductions = parseFloat(taxDeclaration.other_deductions) || 0;
    taxableIncome -= otherDeductions;
  }
  // New regime: only standard deduction applies, no other exemptions

  return Math.max(0, Math.round(taxableIncome));
}

/**
 * Calculate monthly TDS
 * @param {Object} employee - Employee object
 * @param {number} annualGross - Annual gross salary
 * @param {Object} taxDeclaration - Tax declaration object
 * @returns {number} Monthly TDS amount
 */
function calculateMonthlyTDS(employee, annualGross, taxDeclaration) {
  const regime = taxDeclaration ? taxDeclaration.regime : 'new';
  const taxableIncome = calculateTaxableIncome(employee, annualGross, taxDeclaration);
  const annualTax = calculateAnnualTax(taxableIncome, regime);
  return Math.round(annualTax / 12);
}

module.exports = {
  calculateAnnualTax,
  calculateHRAExemption,
  calculateTaxableIncome,
  calculateMonthlyTDS
};
