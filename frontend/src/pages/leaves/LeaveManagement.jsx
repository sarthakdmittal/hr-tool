import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, CheckCircle, XCircle, Eye, Pencil, Trash2,
  CalendarDays, Users, Settings2, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../../api/client';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate, getCurrentYear, getYearOptions } from '../../utils/formatters';

const TABS = ['Requests', 'Allocations', 'Leave Types'];

// ─── Leave Requests Tab ───────────────────────────────────────────────────────

function RequestsTab() {
  const queryClient = useQueryClient();
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewLeave, setViewLeave] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [applyModal, setApplyModal] = useState(false);

  const { data: leaves = [], isLoading, isError, error } = useQuery({
    queryKey: ['leaves', statusFilter, employeeFilter],
    queryFn: () => api.get('/leaves', {
      params: {
        status: statusFilter || undefined,
        employee_id: employeeFilter || undefined,
      },
    }).then(r => r.data),
    throwOnError: false,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get('/employees').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []),
    throwOnError: false,
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/leaves/types').then(r => r.data),
    throwOnError: false,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.put(`/leaves/${id}/approve`),
    onSuccess: () => { toast.success('Leave approved'); queryClient.invalidateQueries({ queryKey: ['leaves'] }); setViewLeave(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to approve leave'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejection_reason }) => api.put(`/leaves/${id}/reject`, { rejection_reason }),
    onSuccess: () => {
      toast.success('Leave rejected');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setRejectModal(null); setViewLeave(null); setRejectReason('');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to reject leave'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.put(`/leaves/${id}/cancel`),
    onSuccess: () => { toast.success('Leave cancelled'); queryClient.invalidateQueries({ queryKey: ['leaves'] }); setViewLeave(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to cancel leave'),
  });

  const applyMutation = useMutation({
    mutationFn: (data) => api.post('/leaves', data),
    onSuccess: () => {
      toast.success('Leave applied');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-allocations'] });
      setApplyModal(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to apply leave'),
  });

  const filtered = leaves;

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
    {
      header: 'Leave Type',
      accessor: 'leave_type',
      render: (val, row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
          {row.leave_type_code || val}
        </span>
      ),
    },
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
    { header: 'Reason', accessor: 'reason', cellClassName: 'max-w-xs truncate text-sm text-gray-600' },
    { header: 'Applied', accessor: 'created_at', render: (val) => <span className="text-sm text-gray-500">{formatDate(val)}</span> },
    { header: 'Status', accessor: 'status', render: (val) => <Badge status={val} /> },
    {
      header: '',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setViewLeave(row)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded" title="View">
            <Eye className="h-4 w-4" />
          </button>
          {row.status === 'pending' && (
            <>
              <button onClick={() => approveMutation.mutate(val)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Approve">
                <CheckCircle className="h-4 w-4" />
              </button>
              <button onClick={() => { setRejectModal(row); setRejectReason(''); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Reject">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {['pending', 'approved'].includes(row.status) && (
            <button onClick={() => cancelMutation.mutate(val)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Cancel">
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3 flex-1">
          <select
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
            className="form-select flex-1 max-w-xs"
          >
            <option value="">All Employees</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name} ({e.emp_id})
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select w-36">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button onClick={() => setApplyModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Apply Leave
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: leaves.length, cls: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: 'Pending', value: leaves.filter(l => l.status === 'pending').length, cls: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
          { label: 'Approved', value: leaves.filter(l => l.status === 'approved').length, cls: 'bg-green-50 text-green-700 border-green-100' },
          { label: 'Rejected', value: leaves.filter(l => l.status === 'rejected').length, cls: 'bg-red-50 text-red-700 border-red-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 border ${s.cls}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load leave requests: {error?.response?.data?.error || error?.message || 'Unknown error'}
        </div>
      )}
      <div className="card p-0">
        <Table columns={columns} data={filtered} loading={isLoading} emptyMessage="No leave requests found" />
      </div>

      {/* View detail modal */}
      <Modal isOpen={!!viewLeave} onClose={() => setViewLeave(null)} title="Leave Request" size="md">
        {viewLeave && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-bold">{viewLeave.employee_name?.charAt(0)}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{viewLeave.employee_name}</p>
                <p className="text-xs text-gray-500">{viewLeave.emp_id}</p>
              </div>
              <Badge status={viewLeave.status} className="ml-auto" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-400">Leave Type</p><p className="font-medium">{viewLeave.leave_type}</p></div>
              <div><p className="text-gray-400">Days</p><p className="font-medium">{viewLeave.days}</p></div>
              <div><p className="text-gray-400">From</p><p className="font-medium">{formatDate(viewLeave.from_date)}</p></div>
              <div><p className="text-gray-400">To</p><p className="font-medium">{formatDate(viewLeave.to_date)}</p></div>
              {viewLeave.reason && <div className="col-span-2"><p className="text-gray-400">Reason</p><p className="font-medium">{viewLeave.reason}</p></div>}
              {viewLeave.rejection_reason && <div className="col-span-2"><p className="text-gray-400">Rejection Reason</p><p className="font-medium text-red-600">{viewLeave.rejection_reason}</p></div>}
            </div>
            {viewLeave.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <button onClick={() => approveMutation.mutate(viewLeave.id)} disabled={approveMutation.isPending} className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700 focus:ring-green-500">
                  <CheckCircle className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => { setRejectModal(viewLeave); setRejectReason(''); }} className="btn-danger flex-1 justify-center">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Leave" size="sm">
        {rejectModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Rejecting leave for <strong>{rejectModal.employee_name}</strong></p>
            <div>
              <label className="form-label">Reason for rejection</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Optional..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, rejection_reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="btn-danger flex-1"
              >
                Reject Leave
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Apply leave modal */}
      <ApplyLeaveModal
        isOpen={applyModal}
        onClose={() => setApplyModal(false)}
        employees={employees}
        leaveTypes={leaveTypes}
        onSubmit={(data) => applyMutation.mutate(data)}
        isPending={applyMutation.isPending}
      />
    </div>
  );
}

function ApplyLeaveModal({ isOpen, onClose, employees, leaveTypes, onSubmit, isPending }) {
  const [form, setForm] = useState({ employee_id: '', leave_type_id: '', from_date: '', to_date: '', days: '', reason: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calcDays = (from, to) => {
    if (!from || !to) return '';
    const d = Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1;
    return d > 0 ? String(d) : '';
  };

  const handleDateChange = (k, v) => {
    const updated = { ...form, [k]: v };
    updated.days = calcDays(k === 'from_date' ? v : form.from_date, k === 'to_date' ? v : form.to_date);
    setForm(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, employee_id: parseInt(form.employee_id), leave_type_id: parseInt(form.leave_type_id), days: parseFloat(form.days) });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply Leave" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Employee *</label>
          <select className="form-select" value={form.employee_id} onChange={e => set('employee_id', e.target.value)} required>
            <option value="">Select employee</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.emp_id})</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Leave Type *</label>
          <select className="form-select" value={form.leave_type_id} onChange={e => set('leave_type_id', e.target.value)} required>
            <option value="">Select type</option>
            {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">From *</label>
            <input type="date" className="form-input" value={form.from_date} onChange={e => handleDateChange('from_date', e.target.value)} required />
          </div>
          <div>
            <label className="form-label">To *</label>
            <input type="date" className="form-input" value={form.to_date} onChange={e => handleDateChange('to_date', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="form-label">Days *</label>
          <input type="number" step="0.5" min="0.5" className="form-input" value={form.days} onChange={e => set('days', e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Reason</label>
          <textarea className="form-input" rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">Apply Leave</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Allocations Tab ──────────────────────────────────────────────────────────

function AllocationsTab() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(getCurrentYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const yearOptions = getYearOptions();

  const { data, isLoading } = useQuery({
    queryKey: ['leave-allocations', year],
    queryFn: () => api.get('/leaves/allocations', { params: { year } }).then(r => r.data),
    throwOnError: false,
  });

  const setMutation = useMutation({
    mutationFn: (payload) => api.post('/leaves/allocations', payload),
    onSuccess: () => { toast.success('Allocation saved'); queryClient.invalidateQueries({ queryKey: ['leave-allocations'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/leaves/allocations/${id}`),
    onSuccess: () => { toast.success('Reset to default'); queryClient.invalidateQueries({ queryKey: ['leave-allocations'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to reset'),
  });

  const employees = Array.isArray(data?.employees) ? data.employees : [];
  const leaveTypes = Array.isArray(data?.leave_types) ? data.leave_types : [];
  const selectedEmployee = employees.find(e => String(e.employee_id) === selectedEmployeeId) || null;

  if (isLoading) return <LoadingSpinner className="py-12" />;

  if (leaveTypes.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 text-sm">No leave types configured. Add leave types first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <label className="form-label">Employee</label>
          <select
            className="form-select"
            value={selectedEmployeeId}
            onChange={e => setSelectedEmployeeId(e.target.value)}
          >
            <option value="">Select an employee</option>
            {employees.map(e => (
              <option key={e.employee_id} value={e.employee_id}>
                {e.name} ({e.emp_id})
              </option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label className="form-label">Year</label>
          <select className="form-select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {yearOptions.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
          </select>
        </div>
      </div>

      {!selectedEmployeeId ? (
        <div className="card text-center py-16">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Select an employee to view and edit their leave allocation</p>
          <p className="text-gray-400 text-xs mt-1">Click the pencil icon on any leave type card to override the default days</p>
        </div>
      ) : !selectedEmployee ? (
        <div className="card text-center py-12 text-sm text-gray-400">Employee not found.</div>
      ) : (
        <div className="space-y-4">
          {/* Employee header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
              {selectedEmployee.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selectedEmployee.name}</p>
              <p className="text-xs text-gray-500">{selectedEmployee.emp_id} · {year}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedEmployee.balances.map(b => (
              <AllocationCard
                key={b.leave_type_id}
                balance={b}
                year={year}
                employeeId={selectedEmployee.employee_id}
                onSave={(days) => setMutation.mutate({ employee_id: selectedEmployee.employee_id, leave_type_id: b.leave_type_id, year, allocated_days: days })}
                onReset={() => deleteMutation.mutate(b.allocation_id)}
                isSaving={setMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AllocationCard({ balance, year, employeeId, onSave, onReset, isSaving }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(balance.allocated));

  const handleSave = () => {
    const days = parseFloat(val);
    if (isNaN(days) || days < 0) return;
    onSave(days);
    setEditing(false);
  };

  return (
    <div className={`rounded-lg border p-3 ${balance.is_custom ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{balance.code}</p>
          <p className="text-sm font-medium text-gray-800">{balance.name}</p>
        </div>
        {balance.is_custom && (
          <span className="text-xs px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded font-medium">Custom</span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2">
        {editing ? (
          <>
            <input
              type="number" step="0.5" min="0"
              className="form-input py-1 px-2 text-sm w-20"
              value={val}
              onChange={e => setVal(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button onClick={handleSave} disabled={isSaving} className="text-xs btn-primary py-1 px-2">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs btn-secondary py-1 px-2">Cancel</button>
          </>
        ) : (
          <>
            <div className="flex-1">
              <div className="flex items-center gap-1 text-sm">
                <span className="font-bold text-gray-900">{balance.balance}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">{balance.allocated}</span>
                <span className="text-gray-400 text-xs ml-1">remaining</span>
              </div>
              <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${balance.balance <= 2 ? 'bg-red-500' : 'bg-primary-500'}`}
                  style={{ width: `${balance.allocated > 0 ? Math.round((balance.used / balance.allocated) * 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{balance.used} used</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => { setVal(String(balance.allocated)); setEditing(true); }} className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded" title="Edit allocation">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {balance.is_custom && (
                <button onClick={onReset} className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Reset to default">
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Leave Types Tab ──────────────────────────────────────────────────────────

function LeaveTypesTab() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'new' | leaveTypeObject

  const { data: leaveTypes = [], isLoading } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/leaves/types').then(r => r.data),
    throwOnError: false,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => data.id ? api.put(`/leaves/types/${data.id}`, data) : api.post('/leaves/types', data),
    onSuccess: () => { toast.success('Leave type saved'); queryClient.invalidateQueries({ queryKey: ['leave-types'] }); setModal(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/leaves/types/${id}`),
    onSuccess: (_, id, ctx) => { toast.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['leave-types'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete'),
  });

  const columns = [
    {
      header: 'Leave Type',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <p className="font-medium text-gray-900">{val}</p>
          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{row.code}</span>
        </div>
      ),
    },
    {
      header: 'Days/Year',
      accessor: 'days_allowed_per_year',
      render: (val) => <span className="font-semibold text-gray-900">{parseFloat(val)}</span>,
    },
    {
      header: 'Paid',
      accessor: 'paid',
      render: (val) => <Badge status={val ? 'paid' : 'unpaid'} />,
    },
    {
      header: 'Carry Forward',
      accessor: 'carry_forward',
      render: (val, row) => val ? `Yes (max ${parseFloat(row.max_carry_forward_days)} days)` : 'No',
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (val) => <Badge status={val ? 'active' : 'inactive'} />,
    },
    {
      header: '',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex gap-1">
          <button onClick={() => setModal(row)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => { if (confirm(`Delete "${row.name}"?`)) deleteMutation.mutate(val); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal('new')} className="btn-primary"><Plus className="h-4 w-4" /> Add Leave Type</button>
      </div>

      <div className="card p-0">
        {isLoading ? <LoadingSpinner className="py-12" /> : (
          <Table
            columns={columns}
            data={leaveTypes}
            emptyMessage="No leave types yet. Add one to get started."
          />
        )}
      </div>

      <LeaveTypeModal
        isOpen={!!modal}
        initialData={modal !== 'new' ? modal : null}
        onClose={() => setModal(null)}
        onSubmit={(data) => saveMutation.mutate(data)}
        isPending={saveMutation.isPending}
      />
    </div>
  );
}

const BLANK_LEAVE_TYPE = { name: '', code: '', days_allowed_per_year: 12, paid: true, carry_forward: false, max_carry_forward_days: 0, description: '', is_active: true };

function LeaveTypeModal({ isOpen, initialData, onClose, onSubmit, isPending }) {
  const [form, setForm] = useState(BLANK_LEAVE_TYPE);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { ...BLANK_LEAVE_TYPE, ...initialData } : BLANK_LEAVE_TYPE);
    }
  }, [isOpen, initialData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, days_allowed_per_year: parseFloat(form.days_allowed_per_year), max_carry_forward_days: parseFloat(form.max_carry_forward_days) || 0 });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Leave Type' : 'Add Leave Type'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Name *</label>
            <input className="form-input" placeholder="Casual Leave" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="form-label">Code *</label>
            <input className="form-input uppercase" placeholder="CL" maxLength={10} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Days allowed per year *</label>
            <input type="number" step="0.5" min="0" className="form-input" value={form.days_allowed_per_year} onChange={e => set('days_allowed_per_year', e.target.value)} required />
          </div>
          <div className="flex flex-col gap-3 pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" checked={form.paid} onChange={e => set('paid', e.target.checked)} />
              <span className="text-sm text-gray-700">Paid leave</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" checked={form.carry_forward} onChange={e => set('carry_forward', e.target.checked)} />
              <span className="text-sm text-gray-700">Allow carry forward</span>
            </label>
          </div>
        </div>
        {form.carry_forward && (
          <div>
            <label className="form-label">Max carry forward days</label>
            <input type="number" step="0.5" min="0" className="form-input w-32" value={form.max_carry_forward_days} onChange={e => set('max_carry_forward_days', e.target.value)} />
          </div>
        )}
        <div>
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} />
        </div>
        {initialData && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
            {isPending ? 'Saving…' : 'Save Leave Type'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState(0);

  const icons = [CalendarDays, Users, Settings2];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage leave requests, allocations and leave types</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab, i) => {
            const Icon = icons[i];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === i
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 0 && <RequestsTab />}
      {activeTab === 1 && <AllocationsTab />}
      {activeTab === 2 && <LeaveTypesTab />}
    </div>
  );
}
