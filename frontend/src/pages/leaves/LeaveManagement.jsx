import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, CheckCircle, XCircle, Eye } from 'lucide-react';
import api from '../../api/client';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

export default function LeaveManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewLeave, setViewLeave] = useState(null);

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves', statusFilter],
    queryFn: () => api.get('/leaves', { params: { status: statusFilter || undefined } }).then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.put(`/leaves/${id}/approve`),
    onSuccess: () => {
      toast.success('Leave approved');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setViewLeave(null);
    },
    onError: () => toast.error('Failed to approve leave'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/leaves/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Leave rejected');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setViewLeave(null);
    },
    onError: () => toast.error('Failed to reject leave'),
  });

  const filtered = leaves.filter(l =>
    !search ||
    l.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.emp_id?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'Employee',
      accessor: 'employee_name',
      render: (val, row) => (
        <div>
          <p className="font-medium text-gray-900">{val}</p>
          <p className="text-xs text-gray-500">{row.emp_id}</p>
        </div>
      ),
    },
    { header: 'Leave Type', accessor: 'leave_type' },
    {
      header: 'Duration',
      accessor: 'from_date',
      render: (val, row) => (
        <div>
          <p className="text-sm">{formatDate(val)} – {formatDate(row.to_date)}</p>
          <p className="text-xs text-gray-500">{row.days} day{row.days !== 1 ? 's' : ''}</p>
        </div>
      ),
    },
    { header: 'Reason', accessor: 'reason', cellClassName: 'max-w-xs truncate' },
    {
      header: 'Applied On',
      accessor: 'created_at',
      render: (val) => formatDate(val),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => <Badge status={val} />,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewLeave(row)}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => approveMutation.mutate(val)}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Approve"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: val, reason: '' })}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Reject"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage employee leave requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="form-select w-40"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: leaves.length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Pending', value: leaves.filter(l => l.status === 'pending').length, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Approved', value: leaves.filter(l => l.status === 'approved').length, color: 'bg-green-50 text-green-700' },
          { label: 'Rejected', value: leaves.filter(l => l.status === 'rejected').length, color: 'bg-red-50 text-red-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color.split(' ')[0]} border border-current/10`}>
            <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
            <p className={`text-sm font-medium ${s.color.split(' ')[1]} opacity-80`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Leave Requests ({filtered.length})</h2>
        </div>
        <Table columns={columns} data={filtered} loading={isLoading} emptyMessage="No leave requests found" />
      </div>

      {/* View Leave Modal */}
      <Modal
        isOpen={!!viewLeave}
        onClose={() => setViewLeave(null)}
        title="Leave Request Details"
        size="md"
      >
        {viewLeave && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-bold text-lg">
                  {viewLeave.employee_name?.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{viewLeave.employee_name}</p>
                <p className="text-sm text-gray-500">{viewLeave.emp_id} · {viewLeave.department}</p>
              </div>
              <Badge status={viewLeave.status} className="ml-auto" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Leave Type</p>
                <p className="font-medium">{viewLeave.leave_type}</p>
              </div>
              <div>
                <p className="text-gray-500">Duration</p>
                <p className="font-medium">{viewLeave.days} day{viewLeave.days !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-gray-500">From</p>
                <p className="font-medium">{formatDate(viewLeave.from_date)}</p>
              </div>
              <div>
                <p className="text-gray-500">To</p>
                <p className="font-medium">{formatDate(viewLeave.to_date)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Reason</p>
                <p className="font-medium">{viewLeave.reason || '—'}</p>
              </div>
            </div>

            {viewLeave.status === 'pending' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => approveMutation.mutate(viewLeave.id)}
                  disabled={approveMutation.isPending}
                  className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700 focus:ring-green-500"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => rejectMutation.mutate({ id: viewLeave.id, reason: '' })}
                  disabled={rejectMutation.isPending}
                  className="btn-danger flex-1 justify-center"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
