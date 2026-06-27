import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, Filter, Users, Edit } from 'lucide-react';
import api from '../../api/client';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

const STATUSES = ['', 'active', 'inactive', 'terminated'];

function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then((r) => r.data),
    staleTime: 30_000,
  });
}

export default function EmployeeList() {
  const navigate = useNavigate();
  const { data: employees, isLoading, isError } = useEmployees();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const departments = useMemo(() => {
    if (!employees) return [];
    const set = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    if (!employees) return [];
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchSearch =
        !q ||
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q) ||
        (emp.emp_id || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q);
      const matchDept = !departmentFilter || emp.department === departmentFilter;
      const matchStatus = !statusFilter || emp.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, departmentFilter, statusFilter]);

  const columns = [
    {
      header: 'Name',
      accessor: 'first_name',
      render: (_val, row) => (
        <Link
          to={`/employees/${row.id}`}
          className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.first_name} {row.last_name}
        </Link>
      ),
    },
    {
      header: 'Emp ID',
      accessor: 'emp_id',
      render: (val) => <span className="text-gray-600 font-mono text-xs">{val || '—'}</span>,
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (val) => val || '—',
    },
    {
      header: 'Designation',
      accessor: 'designation',
      render: (val) => val || '—',
    },
    {
      header: 'Joining Date',
      accessor: 'joining_date',
      render: (val) => formatDate(val),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => (
        <Badge
          status={val}
          label={val ? val.charAt(0).toUpperCase() + val.slice(1) : '—'}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      cellClassName: 'text-right',
      render: (_val, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/employees/${row.id}/edit`);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary-600 border border-gray-200 hover:border-primary-300 bg-white hover:bg-primary-50 px-2.5 py-1.5 rounded-lg transition"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </button>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Users className="h-12 w-12 text-gray-300" />
        <p className="text-sm">Failed to load employees. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {isLoading ? 'Loading…' : `${filtered.length} employee${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => navigate('/employees/new')}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Department */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white appearance-none cursor-pointer min-w-[130px]"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={filtered}
          loading={isLoading}
          emptyMessage="No employees found matching your filters."
          onRowClick={(row) => navigate(`/employees/${row.id}`)}
        />
      </div>
    </div>
  );
}
