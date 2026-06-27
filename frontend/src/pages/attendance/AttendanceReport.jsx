import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import api from '../../api/client';
import Table from '../../components/Table';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getMonthOptions,
  getYearOptions,
  getCurrentMonth,
  getCurrentYear,
} from '../../utils/formatters';

function downloadCSV(data, month, year) {
  const monthLabel = getMonthOptions().find((m) => m.value === month)?.label || month;
  const headers = [
    'Employee Name',
    'Emp ID',
    'Present',
    'Absent',
    'Half Day',
    'LOP',
    'WFH',
    'Leave',
    'Paid Days',
  ];
  const rows = data.map((row) => [
    row.name,
    row.emp_id,
    row.present,
    row.absent,
    row.half_day,
    row.lop,
    row.wfh,
    row.leave,
    row.paid_days,
  ]);
  const csvContent = [headers, ...rows]
    .map((r) => r.map((cell) => `"${cell ?? ''}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_report_${monthLabel}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceReport() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  const { data = [], isLoading } = useQuery({
    queryKey: ['attendance-report', selectedMonth, selectedYear],
    queryFn: () =>
      api
        .get('/attendance/report', { params: { month: selectedMonth, year: selectedYear } })
        .then((r) => r.data),
  });

  const columns = [
    {
      header: 'Employee',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-medium text-gray-900">{val}</div>
          <div className="text-xs text-gray-400">{row.emp_id}</div>
        </div>
      ),
    },
    {
      header: 'Present',
      accessor: 'present',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {val ?? 0}
        </span>
      ),
    },
    {
      header: 'Absent',
      accessor: 'absent',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          {val ?? 0}
        </span>
      ),
    },
    {
      header: 'Half Day',
      accessor: 'half_day',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          {val ?? 0}
        </span>
      ),
    },
    {
      header: 'LOP',
      accessor: 'lop',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-900">
          {val ?? 0}
        </span>
      ),
    },
    {
      header: 'WFH',
      accessor: 'wfh',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {val ?? 0}
        </span>
      ),
    },
    {
      header: 'Leave',
      accessor: 'leave',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {val ?? 0}
        </span>
      ),
    },
    {
      header: 'Paid Days',
      accessor: 'paid_days',
      render: (val) => <span className="font-semibold text-gray-900">{val ?? 0}</span>,
    },
  ];

  const monthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monthly attendance summary for all employees</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => downloadCSV(data, selectedMonth, selectedYear)}
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

        <div className="flex items-center justify-between mb-4">
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
            emptyMessage="No attendance data for this period"
          />
        )}
      </div>
    </div>
  );
}
