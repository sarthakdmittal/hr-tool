import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Shield } from 'lucide-react';
import api from '../../api/client';
import Table from '../../components/Table';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  formatCurrency,
  getMonthOptions,
  getYearOptions,
  getCurrentMonth,
  getCurrentYear,
} from '../../utils/formatters';

function downloadECR(data, month, year) {
  const monthLabel = getMonthOptions().find((m) => m.value === month)?.label || month;
  // ECR format: Member UAN, Member Name, Gross Wages, EPF Wages, EPS Wages, EPF Contrib EE, EPS Contrib ER, EPF Contrib ER, NCP Days, Refund of Advances
  const headers = [
    'Employee Name',
    'UAN',
    'Basic Salary',
    'EPF Employee',
    'EPF Employer',
    'EPS',
    'Total PF',
  ];
  const rows = data.map((row) => [
    row.name || row.employee_name,
    row.uan || '',
    row.basic || 0,
    row.epf_employee || 0,
    row.epf_employer || 0,
    row.eps || 0,
    row.total_pf || 0,
  ]);
  const csvContent = [headers, ...rows]
    .map((r) => r.map((cell) => `"${cell ?? ''}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PF_ECR_${monthLabel}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PFReport() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-pf', selectedMonth, selectedYear],
    queryFn: () =>
      api.get('/reports/pf', { params: { month: selectedMonth, year: selectedYear } }).then((r) => r.data),
  });

  const data = Array.isArray(reportData?.data) ? reportData.data : [];
  const summary = reportData?.summary && typeof reportData.summary === 'object' ? reportData.summary : {};

  const totalEpfEmp = summary.total_employee_pf ?? data.reduce((s, r) => s + (r.epf_employee || 0), 0);
  const totalEpfEr = summary.total_employer_pf ?? data.reduce((s, r) => s + (r.epf_employer || 0), 0);
  const totalEps = summary.total_eps ?? data.reduce((s, r) => s + (r.eps_employer || r.eps || 0), 0);
  const totalPf = summary.total_challan ?? data.reduce((s, r) => s + (r.total_pf || 0), 0);

  const columns = [
    {
      header: 'Employee',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-medium text-gray-900">{val || row.employee_name}</div>
          <div className="text-xs text-gray-400">{row.emp_id}</div>
        </div>
      ),
    },
    {
      header: 'UAN',
      accessor: 'uan',
      render: (val) => <span className="font-mono text-sm">{val || '—'}</span>,
    },
    {
      header: 'Basic Salary',
      accessor: 'basic',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'EPF Employee',
      accessor: 'epf_employee',
      render: (val) => <span className="text-red-600">{formatCurrency(val)}</span>,
    },
    {
      header: 'EPF Employer',
      accessor: 'epf_employer',
      render: (val) => <span className="text-blue-600">{formatCurrency(val)}</span>,
    },
    {
      header: 'EPS',
      accessor: 'eps',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'Total PF',
      accessor: 'total_pf',
      render: (val) => <span className="font-semibold text-gray-900">{formatCurrency(val)}</span>,
    },
  ];

  const monthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PF Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">Provident Fund contribution summary</p>
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={() => downloadECR(data, selectedMonth, selectedYear)}
          disabled={data.length === 0}
        >
          <Download className="h-4 w-4" />
          Download ECR CSV
        </button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="form-label">Month</label>
            <select
              className="form-select w-36"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Year</label>
            <select
              className="form-select w-28"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary cards */}
        {!isLoading && data.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'EPF Employee Total', value: formatCurrency(totalEpfEmp), color: 'text-red-600' },
              { label: 'EPF Employer Total', value: formatCurrency(totalEpfEr), color: 'text-blue-600' },
              { label: 'EPS Total', value: formatCurrency(totalEps), color: 'text-gray-700' },
              { label: 'Total PF Liability', value: formatCurrency(totalPf), color: 'text-primary-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">
            {monthLabel} {selectedYear}
          </h2>
          <span className="text-sm text-gray-400">{data.length} employees</span>
        </div>

        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : (
          <Table
            columns={columns}
            data={data}
            emptyMessage="No PF data for this period. Run payroll first."
          />
        )}
      </div>
    </div>
  );
}
