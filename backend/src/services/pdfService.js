const PDFDocument = require('pdfkit');

/**
 * Format currency amount in Indian format
 */
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Get month name from month number
 */
function getMonthName(month) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || '';
}

/**
 * Generate salary slip PDF
 * @param {Object} payrollItem - PayrollItem with components_json
 * @param {Object} employee - Employee details with department, designation
 * @param {Object} company - Company details
 * @returns {Buffer} PDF buffer
 */
async function generateSalarySlip(payrollItem, employee, company) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 80; // accounting for margins
    const leftMargin = 40;

    // ============ HEADER ============
    doc.fontSize(18).font('Helvetica-Bold').text(company.name || 'Company Name', leftMargin, 40, {
      align: 'center',
      width: pageWidth
    });

    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').text(company.address || '', leftMargin, doc.y, {
      align: 'center',
      width: pageWidth
    });

    const companyDetails = [];
    if (company.pan) companyDetails.push(`PAN: ${company.pan}`);
    if (company.tan) companyDetails.push(`TAN: ${company.tan}`);
    if (company.pf_number) companyDetails.push(`PF No: ${company.pf_number}`);

    if (companyDetails.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica').text(companyDetails.join('  |  '), leftMargin, doc.y, {
        align: 'center',
        width: pageWidth
      });
    }

    // Horizontal line
    doc.moveDown(0.5);
    const lineY = doc.y;
    doc.moveTo(leftMargin, lineY).lineTo(leftMargin + pageWidth, lineY).stroke();
    doc.moveDown(0.5);

    // ============ TITLE ============
    const payrollRun = payrollItem.PayrollRun || payrollItem.payrollRun;
    const month = payrollRun ? payrollRun.month : (payrollItem.month || new Date().getMonth() + 1);
    const year = payrollRun ? payrollRun.year : (payrollItem.year || new Date().getFullYear());
    const monthName = getMonthName(month);

    doc.fontSize(12).font('Helvetica-Bold').text(`SALARY SLIP - ${monthName.toUpperCase()} ${year}`, leftMargin, doc.y, {
      align: 'center',
      width: pageWidth
    });
    doc.moveDown(0.7);

    // ============ EMPLOYEE INFO GRID ============
    const gridY = doc.y;
    const colWidth = pageWidth / 2;
    const labelWidth = 100;
    const valueWidth = colWidth - labelWidth - 10;

    function drawInfoRow(label1, value1, label2, value2, y) {
      doc.fontSize(8).font('Helvetica-Bold').text(label1 + ':', leftMargin, y, { width: labelWidth });
      doc.fontSize(8).font('Helvetica').text(value1 || '-', leftMargin + labelWidth, y, { width: valueWidth });
      if (label2) {
        doc.fontSize(8).font('Helvetica-Bold').text(label2 + ':', leftMargin + colWidth, y, { width: labelWidth });
        doc.fontSize(8).font('Helvetica').text(value2 || '-', leftMargin + colWidth + labelWidth, y, { width: valueWidth });
      }
    }

    const rowHeight = 16;
    const empName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    const deptName = employee.Department ? employee.Department.name : '';
    const desigName = employee.Designation ? employee.Designation.name : '';

    drawInfoRow('Employee Name', empName, 'Employee ID', employee.emp_id, gridY);
    drawInfoRow('Department', deptName, 'Designation', desigName, gridY + rowHeight);
    drawInfoRow('PAN Number', employee.pan_number, 'UAN Number', employee.uan_number, gridY + rowHeight * 2);
    drawInfoRow('Bank Account', employee.bank_account_no, 'IFSC Code', employee.bank_ifsc, gridY + rowHeight * 3);

    doc.y = gridY + rowHeight * 4 + 5;
    doc.moveDown(0.5);

    // ============ ATTENDANCE BOX ============
    const attBoxY = doc.y;
    const attBoxH = 30;
    doc.rect(leftMargin, attBoxY, pageWidth, attBoxH).fillAndStroke('#f5f5f5', '#cccccc');

    const attColW = pageWidth / 3;
    doc.fillColor('#000000');
    doc.fontSize(8).font('Helvetica-Bold').text('Working Days', leftMargin + 10, attBoxY + 5, { width: attColW - 10 });
    doc.fontSize(10).font('Helvetica').text(String(payrollItem.working_days || 0), leftMargin + 10, attBoxY + 15, { width: attColW - 10 });

    doc.fontSize(8).font('Helvetica-Bold').text('Paid Days', leftMargin + attColW + 10, attBoxY + 5, { width: attColW - 10 });
    doc.fontSize(10).font('Helvetica').text(String(payrollItem.paid_days || 0), leftMargin + attColW + 10, attBoxY + 15, { width: attColW - 10 });

    doc.fontSize(8).font('Helvetica-Bold').text('LOP Days', leftMargin + attColW * 2 + 10, attBoxY + 5, { width: attColW - 10 });
    doc.fontSize(10).font('Helvetica').text(String(payrollItem.lop_days || 0), leftMargin + attColW * 2 + 10, attBoxY + 15, { width: attColW - 10 });

    doc.y = attBoxY + attBoxH + 10;

    // ============ EARNINGS & DEDUCTIONS TABLE ============
    const tableY = doc.y;
    const halfTable = pageWidth / 2;
    const col1W = halfTable * 0.6;
    const col2W = halfTable * 0.4;

    // Table header
    doc.rect(leftMargin, tableY, halfTable, 20).fillAndStroke('#2c3e50', '#2c3e50');
    doc.rect(leftMargin + halfTable, tableY, halfTable, 20).fillAndStroke('#2c3e50', '#2c3e50');

    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('EARNINGS', leftMargin + 5, tableY + 6, { width: col1W });
    doc.text('Amount (₹)', leftMargin + col1W, tableY + 6, { width: col2W, align: 'right' });
    doc.text('DEDUCTIONS', leftMargin + halfTable + 5, tableY + 6, { width: col1W });
    doc.text('Amount (₹)', leftMargin + halfTable + col1W, tableY + 6, { width: col2W, align: 'right' });

    doc.fillColor('#000000');

    // Get components
    const componentsJson = payrollItem.components_json || {};
    const earnings = componentsJson.earnings ? Object.values(componentsJson.earnings) : [];
    const deductions = componentsJson.deductions ? Object.values(componentsJson.deductions) : [];

    const maxRows = Math.max(earnings.length, deductions.length);
    let currentY = tableY + 20;
    const dataRowH = 18;

    for (let i = 0; i < maxRows; i++) {
      const bgColor = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
      doc.rect(leftMargin, currentY, halfTable, dataRowH).fillAndStroke(bgColor, '#e0e0e0');
      doc.rect(leftMargin + halfTable, currentY, halfTable, dataRowH).fillAndStroke(bgColor, '#e0e0e0');
      doc.fillColor('#000000');

      if (earnings[i]) {
        doc.fontSize(8).font('Helvetica').text(earnings[i].name, leftMargin + 5, currentY + 5, { width: col1W - 5 });
        doc.fontSize(8).font('Helvetica').text(formatCurrency(earnings[i].amount), leftMargin + col1W, currentY + 5, { width: col2W - 5, align: 'right' });
      }

      if (deductions[i]) {
        doc.fontSize(8).font('Helvetica').text(deductions[i].name, leftMargin + halfTable + 5, currentY + 5, { width: col1W - 5 });
        doc.fontSize(8).font('Helvetica').text(formatCurrency(deductions[i].amount), leftMargin + halfTable + col1W, currentY + 5, { width: col2W - 5, align: 'right' });
      }

      currentY += dataRowH;
    }

    // Footer row
    const grossSalary = parseFloat(payrollItem.gross_salary) || 0;
    const totalDeductions = parseFloat(payrollItem.total_deductions) || 0;

    doc.rect(leftMargin, currentY, halfTable, 22).fillAndStroke('#ecf0f1', '#cccccc');
    doc.rect(leftMargin + halfTable, currentY, halfTable, 22).fillAndStroke('#ecf0f1', '#cccccc');
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
    doc.text('GROSS EARNINGS', leftMargin + 5, currentY + 7, { width: col1W - 5 });
    doc.text(formatCurrency(grossSalary), leftMargin + col1W, currentY + 7, { width: col2W - 5, align: 'right' });
    doc.text('TOTAL DEDUCTIONS', leftMargin + halfTable + 5, currentY + 7, { width: col1W - 5 });
    doc.text(formatCurrency(totalDeductions), leftMargin + halfTable + col1W, currentY + 7, { width: col2W - 5, align: 'right' });

    currentY += 22;
    doc.y = currentY + 15;

    // ============ NET PAY BOX ============
    const netSalary = parseFloat(payrollItem.net_salary) || 0;
    const netBoxY = doc.y;
    const netBoxH = 40;

    doc.rect(leftMargin, netBoxY, pageWidth, netBoxH).fillAndStroke('#27ae60', '#27ae60');
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
      .text(`NET SALARY: ₹ ${formatCurrency(netSalary)}`, leftMargin, netBoxY + 12, {
        align: 'center',
        width: pageWidth
      });
    doc.fillColor('#000000');
    doc.y = netBoxY + netBoxH + 10;

    // ============ EMPLOYER CONTRIBUTIONS ============
    const empContribs = componentsJson.employer_contributions || {};
    const employerPF = empContribs.EPF ? empContribs.EPF.amount : (parseFloat(payrollItem.epf_employer) || 0);
    const employerESIC = empContribs.ESIC ? empContribs.ESIC.amount : (parseFloat(payrollItem.esic_employer) || 0);
    const totalCTC = netSalary + totalDeductions + employerPF + employerESIC;

    doc.fontSize(8).font('Helvetica').fillColor('#555555')
      .text(`Employer PF: ₹${formatCurrency(employerPF)}   |   Employer ESIC: ₹${formatCurrency(employerESIC)}   |   Total CTC This Month: ₹${formatCurrency(totalCTC)}`,
        leftMargin, doc.y, { align: 'center', width: pageWidth });

    // ============ FOOTER ============
    doc.moveDown(1.5);
    const footerLineY = doc.y;
    doc.moveTo(leftMargin, footerLineY).lineTo(leftMargin + pageWidth, footerLineY).stroke('#cccccc');
    doc.moveDown(0.3);
    doc.fontSize(7).font('Helvetica').fillColor('#888888')
      .text('This is a computer generated salary slip and does not require signature.',
        leftMargin, doc.y, { align: 'center', width: pageWidth });

    doc.end();
  });
}

/**
 * Generate offer letter PDF
 * @param {Object} offerData - OfferLetter model instance
 * @param {Object} employee - Employee details (optional)
 * @param {Object} company - Company details
 * @returns {Buffer} PDF buffer
 */
async function generateOfferLetter(offerData, employee, company) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 120;
    const leftMargin = 60;

    // ============ COMPANY LETTERHEAD ============
    doc.fontSize(20).font('Helvetica-Bold').text(company.name || 'Company Name', leftMargin, 50, {
      align: 'center',
      width: pageWidth
    });

    doc.moveDown(0.2);
    if (company.address) {
      doc.fontSize(9).font('Helvetica').text(company.address, leftMargin, doc.y, {
        align: 'center',
        width: pageWidth
      });
    }

    const contactParts = [];
    if (company.phone) contactParts.push(`Tel: ${company.phone}`);
    if (company.email) contactParts.push(`Email: ${company.email}`);
    if (company.website) contactParts.push(`Web: ${company.website}`);

    if (contactParts.length > 0) {
      doc.moveDown(0.2);
      doc.fontSize(9).font('Helvetica').text(contactParts.join('  |  '), leftMargin, doc.y, {
        align: 'center',
        width: pageWidth
      });
    }

    doc.moveDown(0.5);
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke('#333333');
    doc.moveDown(1);

    // ============ DATE ============
    const offerDate = offerData.offer_date
      ? new Date(offerData.offer_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.fontSize(10).font('Helvetica').text(`Date: ${offerDate}`, leftMargin, doc.y, { align: 'right', width: pageWidth });
    doc.moveDown(1);

    // ============ CANDIDATE ADDRESS ============
    doc.fontSize(10).font('Helvetica-Bold').text(offerData.candidate_name || '', leftMargin, doc.y);
    if (offerData.candidate_address) {
      doc.fontSize(10).font('Helvetica').text(offerData.candidate_address, leftMargin, doc.y);
    }
    doc.moveDown(1);

    // ============ HEADING ============
    doc.fontSize(13).font('Helvetica-Bold').text('OFFER OF EMPLOYMENT', leftMargin, doc.y, {
      align: 'center',
      width: pageWidth,
      underline: true
    });
    doc.moveDown(0.8);

    // ============ SALUTATION & BODY ============
    const firstName = (offerData.candidate_name || '').split(' ')[0];
    doc.fontSize(10).font('Helvetica').text(`Dear ${firstName},`, leftMargin, doc.y);
    doc.moveDown(0.5);

    const joiningDate = offerData.joining_date
      ? new Date(offerData.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : '';

    doc.fontSize(10).font('Helvetica').text(
      `We are pleased to offer you the position of ${offerData.designation} in the ${offerData.department} department at ${company.name}. ` +
      `We believe that your skills and experience will be a valuable addition to our team. ` +
      `This offer is contingent upon the successful completion of reference checks and verification of credentials.`,
      leftMargin, doc.y, { width: pageWidth, align: 'justify' }
    );
    doc.moveDown(0.7);

    // ============ JOINING DETAILS ============
    doc.fontSize(11).font('Helvetica-Bold').text('Joining Details:', leftMargin, doc.y);
    doc.moveDown(0.3);

    const detailLabelW = 160;
    const detailValueW = pageWidth - detailLabelW;

    function drawDetail(label, value) {
      const y = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').text(label + ':', leftMargin, y, { width: detailLabelW, continued: false });
      doc.fontSize(10).font('Helvetica').text(value || '-', leftMargin + detailLabelW, y, { width: detailValueW });
      doc.moveDown(0.1);
    }

    drawDetail('Role', offerData.designation);
    drawDetail('Department', offerData.department);
    drawDetail('Location', company.city || company.address || '-');
    drawDetail('Reporting To', offerData.reporting_manager || '-');
    drawDetail('Date of Joining', joiningDate);
    drawDetail('Probation Period', `${offerData.probation_period || 6} months`);
    drawDetail('Notice Period', `${offerData.notice_period || 2} months`);

    doc.moveDown(0.8);

    // ============ CTC BREAKUP TABLE ============
    doc.fontSize(11).font('Helvetica-Bold').text('CTC Breakup (per annum):', leftMargin, doc.y);
    doc.moveDown(0.3);

    const ctcTableY = doc.y;
    const ctcCol1 = pageWidth * 0.5;
    const ctcCol2 = pageWidth * 0.25;
    const ctcCol3 = pageWidth * 0.25;
    const ctcRowH = 20;

    // Table header
    doc.rect(leftMargin, ctcTableY, pageWidth, ctcRowH).fillAndStroke('#2c3e50', '#2c3e50');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Component', leftMargin + 5, ctcTableY + 6, { width: ctcCol1 - 5 });
    doc.text('Monthly (₹)', leftMargin + ctcCol1, ctcTableY + 6, { width: ctcCol2, align: 'right' });
    doc.text('Annual (₹)', leftMargin + ctcCol1 + ctcCol2, ctcTableY + 6, { width: ctcCol3 - 5, align: 'right' });
    doc.fillColor('#000000');

    let ctcY = ctcTableY + ctcRowH;
    const ctcBreakup = offerData.ctc_breakup || {};
    const ctcComponents = Array.isArray(ctcBreakup) ? ctcBreakup : Object.values(ctcBreakup);

    let totalAnnual = 0;
    let totalMonthly = 0;

    // Add default components if none provided
    const displayComponents = ctcComponents.length > 0 ? ctcComponents : [
      { name: 'Basic Salary', monthly: Math.round(parseFloat(offerData.ctc) / 12 * 0.4 * 100) / 100 },
      { name: 'HRA', monthly: Math.round(parseFloat(offerData.ctc) / 12 * 0.2 * 100) / 100 },
      { name: 'Special Allowance', monthly: Math.round(parseFloat(offerData.ctc) / 12 * 0.4 * 100) / 100 }
    ];

    displayComponents.forEach((comp, idx) => {
      const monthly = parseFloat(comp.monthly || comp.amount || 0);
      const annual = parseFloat(comp.annual || monthly * 12);
      totalMonthly += monthly;
      totalAnnual += annual;

      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9f9f9';
      doc.rect(leftMargin, ctcY, pageWidth, ctcRowH).fillAndStroke(bgColor, '#e0e0e0');
      doc.fillColor('#000000').fontSize(9).font('Helvetica');
      doc.text(comp.name || comp.component || '', leftMargin + 5, ctcY + 6, { width: ctcCol1 - 5 });
      doc.text(formatCurrency(monthly), leftMargin + ctcCol1, ctcY + 6, { width: ctcCol2, align: 'right' });
      doc.text(formatCurrency(annual), leftMargin + ctcCol1 + ctcCol2, ctcY + 6, { width: ctcCol3 - 5, align: 'right' });
      ctcY += ctcRowH;
    });

    // Gross Salary row
    doc.rect(leftMargin, ctcY, pageWidth, ctcRowH).fillAndStroke('#ecf0f1', '#cccccc');
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
    doc.text('Gross Salary', leftMargin + 5, ctcY + 6, { width: ctcCol1 - 5 });
    doc.text(formatCurrency(totalMonthly), leftMargin + ctcCol1, ctcY + 6, { width: ctcCol2, align: 'right' });
    doc.text(formatCurrency(totalAnnual), leftMargin + ctcCol1 + ctcCol2, ctcY + 6, { width: ctcCol3 - 5, align: 'right' });
    ctcY += ctcRowH;

    // EPF Employer row
    const epfMonthly = Math.round(Math.min(totalMonthly * 0.4, 15000) * 0.12);
    const epfAnnual = epfMonthly * 12;
    doc.rect(leftMargin, ctcY, pageWidth, ctcRowH).fillAndStroke('#ffffff', '#e0e0e0');
    doc.fillColor('#000000').fontSize(9).font('Helvetica');
    doc.text('EPF (Employer Contribution)', leftMargin + 5, ctcY + 6, { width: ctcCol1 - 5 });
    doc.text(formatCurrency(epfMonthly), leftMargin + ctcCol1, ctcY + 6, { width: ctcCol2, align: 'right' });
    doc.text(formatCurrency(epfAnnual), leftMargin + ctcCol1 + ctcCol2, ctcY + 6, { width: ctcCol3 - 5, align: 'right' });
    ctcY += ctcRowH;

    // Total CTC
    const totalCTCAnnual = parseFloat(offerData.ctc) || totalAnnual + epfAnnual;
    const totalCTCMonthly = Math.round(totalCTCAnnual / 12);
    doc.rect(leftMargin, ctcY, pageWidth, ctcRowH).fillAndStroke('#2c3e50', '#2c3e50');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    doc.text('Total CTC', leftMargin + 5, ctcY + 6, { width: ctcCol1 - 5 });
    doc.text(formatCurrency(totalCTCMonthly), leftMargin + ctcCol1, ctcY + 6, { width: ctcCol2, align: 'right' });
    doc.text(formatCurrency(totalCTCAnnual), leftMargin + ctcCol1 + ctcCol2, ctcY + 6, { width: ctcCol3 - 5, align: 'right' });
    ctcY += ctcRowH;

    doc.fillColor('#000000');
    doc.y = ctcY + 15;

    // ============ STANDARD TERMS ============
    doc.fontSize(10).font('Helvetica').text(
      'This offer is subject to the following terms and conditions: (1) Successful verification of all documents and credentials provided. ' +
      '(2) Maintaining satisfactory performance throughout the probation period. ' +
      '(3) Adherence to company policies and code of conduct. ' +
      `(4) This offer is valid till ${offerData.valid_till ? new Date(offerData.valid_till).toLocaleDateString('en-IN') : '15 days from the date of this letter'}. ` +
      'We look forward to welcoming you to our team.',
      leftMargin, doc.y, { width: pageWidth, align: 'justify' }
    );
    doc.moveDown(1);

    // ============ ADDITIONAL TERMS ============
    if (offerData.additional_terms) {
      doc.fontSize(10).font('Helvetica-Bold').text('Additional Terms & Conditions:', leftMargin, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica').text(offerData.additional_terms, leftMargin, doc.y, { width: pageWidth, align: 'justify' });
      doc.moveDown(1);
    }

    // ============ SIGNATURE BLOCK ============
    doc.fontSize(10).font('Helvetica').text('Yours sincerely,', leftMargin, doc.y);
    doc.moveDown(2.5);
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + 150, doc.y).stroke('#333333');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica-Bold').text('Authorized Signatory', leftMargin, doc.y);
    doc.fontSize(9).font('Helvetica').text(company.name || '', leftMargin, doc.y);
    doc.moveDown(1.5);

    // ============ ACCEPTANCE SECTION ============
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('ACCEPTANCE', leftMargin, doc.y, { align: 'center', width: pageWidth });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `I, ${offerData.candidate_name}, hereby accept the offer of employment for the position of ${offerData.designation} at ${company.name} ` +
      `on the terms and conditions stated above.`,
      leftMargin, doc.y, { width: pageWidth }
    );
    doc.moveDown(2);

    const sigY = doc.y;
    doc.moveTo(leftMargin, sigY).lineTo(leftMargin + 200, sigY).stroke('#333333');
    doc.moveTo(leftMargin + pageWidth - 160, sigY).lineTo(leftMargin + pageWidth, sigY).stroke('#333333');

    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    doc.text('Signature of Candidate', leftMargin, doc.y, { width: 200 });
    doc.text('Date of Acceptance', leftMargin + pageWidth - 160, sigY + 5, { width: 160, align: 'right' });

    doc.end();
  });
}

async function generateResignationLetter(resignData, employee, company) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 120;
    const leftMargin = 60;

    const fmt = (dateStr) => dateStr
      ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—';

    // Letterhead
    doc.fontSize(20).font('Helvetica-Bold').text(company.name || 'Company Name', leftMargin, 50, { align: 'center', width: pageWidth });
    doc.moveDown(0.2);
    if (company.address) doc.fontSize(9).font('Helvetica').text(company.address, leftMargin, doc.y, { align: 'center', width: pageWidth });
    doc.moveDown(0.5);
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke('#333333');
    doc.moveDown(1.5);

    // Date
    doc.fontSize(10).font('Helvetica').text(`Date: ${fmt(resignData.resignation_date)}`, leftMargin, doc.y, { align: 'right', width: pageWidth });
    doc.moveDown(1);

    // To
    doc.fontSize(10).font('Helvetica-Bold').text('To,', leftMargin);
    doc.font('Helvetica').text('The HR Manager', leftMargin);
    doc.text(company.name || 'Company Name', leftMargin);
    doc.moveDown(1.5);

    // Subject
    doc.fontSize(11).font('Helvetica-Bold').text('Subject: Resignation Letter', leftMargin);
    doc.moveDown(1);

    // Salutation
    doc.fontSize(10).font('Helvetica').text('Dear Sir/Madam,', leftMargin);
    doc.moveDown(0.8);

    // Body
    const empName = `${employee.first_name} ${employee.last_name}`;
    const desig = employee.Designation?.name || resignData.designation || 'my current position';
    const dept = employee.Department?.name || resignData.department || 'the department';

    doc.text(
      `I, ${empName} (Employee ID: ${employee.emp_id}), am writing to formally notify you of my resignation from the position of ${desig} in the ${dept} department, effective ${fmt(resignData.last_working_date)}.`,
      leftMargin, doc.y, { width: pageWidth, align: 'justify' }
    );
    doc.moveDown(0.8);

    if (resignData.reason) {
      doc.text(resignData.reason, leftMargin, doc.y, { width: pageWidth, align: 'justify' });
      doc.moveDown(0.8);
    }

    doc.text(
      `My last working day will be ${fmt(resignData.last_working_date)}.${resignData.notice_period_waived ? ' I request that the notice period be waived.' : ''}`,
      leftMargin, doc.y, { width: pageWidth }
    );
    doc.moveDown(0.8);

    doc.text(
      'I am grateful for the opportunities provided during my tenure and will ensure a smooth handover of my responsibilities before my last working day.',
      leftMargin, doc.y, { width: pageWidth, align: 'justify' }
    );
    doc.moveDown(0.8);

    doc.text('Thank you for your understanding and support.', leftMargin);
    doc.moveDown(2);

    // Signature
    doc.text('Yours sincerely,', leftMargin);
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text(empName, leftMargin);
    doc.font('Helvetica').text(desig, leftMargin);
    doc.text(`Employee ID: ${employee.emp_id}`, leftMargin);
    if (employee.email) doc.text(employee.email, leftMargin);

    doc.end();
  });
}

module.exports = {
  generateSalarySlip,
  generateOfferLetter,
  generateResignationLetter
};
