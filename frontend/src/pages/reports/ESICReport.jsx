import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Heart } from 'lucide-react';
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

function downloadESICCSV(data, month, year) {
  const monthLabel = getMonthOptions().find((m) => m.value === month)?.label || month;
  const headers = [
    'Employee Name',
    'Emp ID',
    'ESIC Number',
    'Gross Wages',
    'ESIC Employee (0.75%)',
    'ESIC Employer (3.25%)',
    'Total ESIC',
  ];
  const rows = data.map((row) => [
    row.name || row.employee_name,
    row.emp_id || '',
    row.esic_number || '',
    row.gross_salary || 0,
    row.esic_employee || 0,
    row.esic_employer || 0,
    row.total_esic || 0,
  ]);
  const csvContent = [headers, ...rows]
    .map((r) => r.map((cell) => `"${cell ?? ''}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ESIC_Report_${monthLabel}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ESICReport() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-esic', selectedMonth, selectedYear],
    queryFn: () =>
      api.get('/reports/esic', { params: { month: selectedMonth, year: selectedYear } }).then((r) => r.data),
  });

  const data = reportData?.data || [];
  const summary = reportData?.summary || {};

  const totalGross = summary.total_gross ?? data.reduce((s, r) => s + (r.gross_salary || 0), 0);
  const totalEsicEmp = summary.total_employee_esic ?? data.reduce((s, r) => s + (r.esic_employee || 0), 0);
  const totalEsicEr = summary.total_employer_esic ?? data.reduce((s, r) => s + (r.esic_employer || 0), 0);
  const totalEsic = summary.total_challan ?? data.reduce((s, r) => s + (r.total_esic || 0), 0);

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
      header: 'ESIC Number',
      accessor: 'esic_number',
      render: (val) => <span className="font-mono text-sm">{val || '—'}</span>,
    },
    {
      header: 'Gross Wages',
      accessor: 'gross_salary',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'ESIC Employee (0.75%)',
      accessor: 'esic_employee',
      render: (val) => (
        <span className="text-red-600 font-medium">{formatCurrency(val)}</span>
      ),
    },
    {
      header: 'ESIC Employer (3.25%)',
      accessor: 'esic_employer',
      render: (val) => (
        <span className="text-blue-600 font-medium">{formatCurrency(val)}</span>
      ),
    },
    {
      header: 'Total ESIC',
      accessor: 'total_esic',
      render: (val) => (
        <span className="font-bold text-gray-900">{formatCurrency(val)}</span>
      ),
    },
  ];

  const monthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-lg">
            <Heart className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ESIC Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">Employee State Insurance contribution summary</p>
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={() => downloadESICCSV(data, selectedMonth, selectedYear)}
          disabled={data.length === 0}
        >
          <Download className="h-4 w-4" />
          Download CSV
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
              { label: 'Total Gross Wages', value: formatCurrency(totalGross), color: 'text-gray-900' },
              { label: 'ESIC Employee (0.75%)', value: formatCurrency(totalEsicEmp), color: 'text-red-600' },
              { label: 'ESIC Employer (3.25%)', value: formatCurrency(totalEsicEr), color: 'text-blue-600' },
              { label: 'Total ESIC Liability', value: formatCurrency(totalEsic), color: 'text-primary-700' },
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
            emptyMessage="No ESIC data for this period. Run payroll first."
          />
        )}
      </div>

      {/* ESIC Rate Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">ESIC Contribution Rates</h3>
        <div className="grid grid-cols-2 gap-3 text-xs text-blue-700">
          <div className="flex justify-between">
            <span>Employee contribution:</span>
            <span className="font-semibold">0.75% of gross wages</span>
          </div>
          <div className="flex justify-between">
            <span>Employer contribution:</span>
            <span className="font-semibold">3.25% of gross wages</span>
          </div>
          <div className="flex justify-between">
            <span>Applicable when gross wages:</span>
            <span className="font-semibold">≤ ₹21,000 / month</span>
          </div>
          <div className="flex justify-between">
            <span>Total contribution:</span>
            <span className="font-semibold">4.00% of gross wages</span>
          </div>
        </div>
      </div>
    </div>
  );
}
