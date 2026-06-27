import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, UserCheck, CalendarOff, DollarSign } from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Table from '../components/Table';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, formatMonthYear } from '../utils/formatters';

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
    staleTime: 60_000,
  });
}

function useAttendanceChart() {
  return useQuery({
    queryKey: ['dashboard', 'attendance-chart'],
    queryFn: () => api.get('/dashboard/attendance-chart').then((r) => r.data),
    staleTime: 60_000,
  });
}

function useRecentPayrolls() {
  return useQuery({
    queryKey: ['dashboard', 'recent-payrolls'],
    queryFn: () => api.get('/dashboard/recent-payrolls').then((r) => r.data),
    staleTime: 60_000,
  });
}

const payrollColumns = [
  {
    header: 'Month',
    accessor: 'month',
    render: (val, row) => {
      if (row.month_year) return formatMonthYear(row.month_year);
      if (row.month && row.year) {
        const d = new Date(row.year, (row.month || 1) - 1, 1);
        return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }
      return val || '—';
    },
  },
  {
    header: 'Total Employees',
    accessor: 'total_employees',
    render: (val) => val ?? '—',
  },
  {
    header: 'Total Gross',
    accessor: 'total_gross',
    render: (val) => formatCurrency(val),
  },
  {
    header: 'Status',
    accessor: 'status',
    render: (val) => <Badge status={val} label={val ? val.charAt(0).toUpperCase() + val.slice(1) : '—'} />,
  },
];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: chartData, isLoading: chartLoading } = useAttendanceChart();
  const { data: recentPayrolls, isLoading: payrollsLoading } = useRecentPayrolls();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your workforce and payroll activity.</p>
      </div>

      {/* Stat Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title="Total Employees"
            value={stats?.total_employees ?? '—'}
            subtitle="Active headcount"
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Present Today"
            value={stats?.present_today ?? '—'}
            subtitle="Checked in"
            icon={UserCheck}
            color="green"
          />
          <StatCard
            title="On Leave Today"
            value={stats?.on_leave_today ?? '—'}
            subtitle="Approved leaves"
            icon={CalendarOff}
            color="yellow"
          />
          <StatCard
            title="Payroll This Month"
            value={stats?.payroll_this_month != null ? formatCurrency(stats.payroll_this_month, true) : '—'}
            subtitle="Gross payout"
            icon={DollarSign}
            color="purple"
          />
        </div>
      )}

      {/* Charts + Recent Payrolls */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attendance Bar Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Attendance Overview</h2>
          <p className="text-xs text-gray-500 mb-5">Last 6 months — present vs absent</p>
          {chartLoading ? (
            <div className="flex items-center justify-center h-[280px]">
              <LoadingSpinner size="lg" />
            </div>
          ) : !chartData?.length ? (
            <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">
              No attendance data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Bar dataKey="present" name="Present" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Payrolls */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Recent Payrolls</h2>
          <p className="text-xs text-gray-500 mb-5">Latest payroll runs</p>
          <Table
            columns={payrollColumns}
            data={recentPayrolls ?? []}
            loading={payrollsLoading}
            emptyMessage="No payroll records yet."
          />
        </div>
      </div>
    </div>
  );
}
