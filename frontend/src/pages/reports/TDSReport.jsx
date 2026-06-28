import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import api from '../../api/client';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  formatCurrency,
  getMonthOptions,
  getYearOptions,
  getCurrentMonth,
  getCurrentYear,
} from '../../utils/formatters';

function downloadTDSCSV(data, month, year) {
  const monthLabel = getMonthOptions().find((m) => m.value === month)?.label || month;
  const headers = [
    'Employee Name',
    'Emp ID',
    'PAN',
    'Gross Salary',
    'Taxable Income',
    'TDS This Month',
    'Tax Regime',
  ];
  const rows = data.map((row) => [
    row.name || row.employee_name,
    row.emp_id || '',
    row.pan || '',
    row.gross || 0,
    row.taxable_income || 0,
    row.tds || 0,
    row.regime || '',
  ]);
  const csvContent = [headers, ...rows]
    .map((r) => r.map((cell) => `"${cell ?? ''}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TDS_Report_${monthLabel}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TDSReport() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-tds', selectedMonth, selectedYear],
    queryFn: () =>
      api.get('/reports/tds', { params: { month: selectedMonth, year: selectedYear } }).then((r) => r.data),
  });

  const data = Array.isArray(reportData?.data) ? reportData.data : [];
  const totalGross = data.reduce((s, r) => s + (r.gross_salary || r.gross || 0), 0);
  const totalTaxable = data.reduce((s, r) => s + (r.taxable_income || 0), 0);
  const totalTds = reportData?.total_tds ?? data.reduce((s, r) => s + (r.tds || 0), 0);

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
      header: 'PAN',
      accessor: 'pan',
      render: (val) => (
        <span className="font-mono text-sm tracking-wider">{val || '—'}</span>
      ),
    },
    {
      header: 'Gross Salary',
      accessor: 'gross',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'Taxable Income',
      accessor: 'taxable_income',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'TDS This Month',
      accessor: 'tds',
      render: (val) => (
        <span className={`font-semibold ${val > 0 ? 'text-red-700' : 'text-gray-500'}`}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      header: 'Tax Regime',
      accessor: 'regime',
      render: (val) => {
        if (!val) return '—';
        const isNew = val?.toLowerCase() === 'new';
        return (
          <Badge
            label={isNew ? 'New Regime' : 'Old Regime'}
            variant={isNew ? 'blue' : 'orange'}
          />
        );
      },
    },
  ];

  const monthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <FileText className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TDS Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tax Deducted at Source summary</p>
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={() => downloadTDSCSV(data, selectedMonth, selectedYear)}
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
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Gross Salary', value: formatCurrency(totalGross), color: 'text-gray-900' },
              { label: 'Total Taxable Income', value: formatCurrency(totalTaxable), color: 'text-orange-700' },
              { label: 'Total TDS Deducted', value: formatCurrency(totalTds), color: 'text-red-700' },
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
            emptyMessage="No TDS data for this period. Run payroll first."
          />
        )}
      </div>
    </div>
  );
}
