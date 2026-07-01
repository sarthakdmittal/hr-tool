import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Trash2, Clock, Filter, Users, Shield } from 'lucide-react';
import api from '../api/client';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { formatDate } from '../utils/formatters';
import { getUser } from '../store/authStore';

const STATUS_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const ROLE_LABELS = {
  hr_admin: { label: 'HR Admin', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  manager: { label: 'Manager', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  employee: { label: 'Employee', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const SECTION_TABS = ['Account Requests', 'User Management'];

export default function AccountRequests() {
  const queryClient = useQueryClient();
  const currentUser = getUser();

  const [section, setSection] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionModal, setActionModal] = useState(null);
  const [hrNotes, setHrNotes] = useState('');
  const [roleModal, setRoleModal] = useState(null); // { user, newRole }

  // ── Account requests ──────────────────────────────────────────────────────
  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ['account-requests', statusFilter],
    queryFn: () => api.get('/account-requests', { params: { status: statusFilter || undefined } }).then(r => r.data),
    throwOnError: false,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, hr_notes }) => api.put(`/account-requests/${id}/approve`, { hr_notes }),
    onSuccess: () => {
      toast.success('Account approved — employee can now sign in');
      queryClient.invalidateQueries({ queryKey: ['account-requests'] });
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setActionModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, hr_notes }) => api.put(`/account-requests/${id}/reject`, { hr_notes }),
    onSuccess: () => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['account-requests'] });
      setActionModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to reject'),
  });

  const deleteReqMutation = useMutation({
    mutationFn: (id) => api.delete(`/account-requests/${id}`),
    onSuccess: () => { toast.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['account-requests'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete'),
  });

  // ── Users ──────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['company-users'],
    queryFn: () => api.get('/auth/users').then(r => r.data),
    throwOnError: false,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.put(`/auth/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setRoleModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update role'),
  });

  // ── Request columns ────────────────────────────────────────────────────────
  const reqColumns = [
    {
      header: 'Employee',
      accessor: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 text-xs font-bold">{val?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{val}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Employee Record',
      accessor: 'Employee',
      render: (val) => val
        ? <span className="text-sm text-gray-700">{val.first_name} {val.last_name} ({val.emp_id})</span>
        : <span className="text-xs text-gray-400 italic">Not linked</span>,
    },
    {
      header: 'Requested',
      accessor: 'created_at',
      render: (val) => <span className="text-sm text-gray-500">{formatDate(val)}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[val] || ''}`}>
          {val === 'pending' && <Clock className="h-3 w-3" />}
          {val === 'approved' && <CheckCircle className="h-3 w-3" />}
          {val === 'rejected' && <XCircle className="h-3 w-3" />}
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </span>
      ),
    },
    {
      header: 'HR Notes',
      accessor: 'hr_notes',
      render: (val) => val ? <span className="text-xs text-gray-500 max-w-xs truncate block">{val}</span> : null,
    },
    {
      header: '',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex items-center gap-1">
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => { setHrNotes(''); setActionModal({ type: 'approve', request: row }); }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
              >
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                onClick={() => { setHrNotes(''); setActionModal({ type: 'reject', request: row }); }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
          <button
            onClick={() => { if (confirm('Delete this request?')) deleteReqMutation.mutate(val); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // ── User columns ───────────────────────────────────────────────────────────
  const userColumns = [
    {
      header: 'User',
      accessor: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 text-xs font-bold">{val?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{val} {row.id === currentUser?.id && <span className="text-xs text-gray-400">(you)</span>}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (val) => {
        const r = ROLE_LABELS[val] || { label: val, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${r.cls}`}>
            <Shield className="h-3 w-3" />
            {r.label}
          </span>
        );
      },
    },
    {
      header: 'Joined',
      accessor: 'created_at',
      render: (val) => <span className="text-sm text-gray-500">{formatDate(val)}</span>,
    },
    {
      header: '',
      accessor: 'id',
      render: (val, row) => {
        if (row.id === currentUser?.id) return null;
        return (
          <select
            value={row.role}
            onChange={e => setRoleModal({ user: row, newRole: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white hover:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="hr_admin">HR Admin</option>
          </select>
        );
      },
    },
  ];

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage access requests and user roles</p>
      </div>

      {/* Section tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {SECTION_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setSection(i)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                section === i
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {i === 0 ? <Clock className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              {tab}
              {i === 0 && pendingCount > 0 && (
                <span className="ml-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-yellow-500 text-white text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Account Requests */}
      {section === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-gray-400" />
            {['pending', 'approved', 'rejected', ''].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  statusFilter === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="card p-0">
            <Table
              columns={reqColumns}
              data={requests}
              loading={reqLoading}
              emptyMessage={statusFilter === 'pending' ? 'No pending account requests' : 'No requests found'}
            />
          </div>
        </div>
      )}

      {/* User Management */}
      {section === 1 && (
        <div className="card p-0">
          <Table
            columns={userColumns}
            data={users}
            loading={usersLoading}
            emptyMessage="No users found"
          />
        </div>
      )}

      {/* Approve / Reject modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.type === 'approve' ? 'Approve Account Request' : 'Reject Account Request'}
        size="sm"
      >
        {actionModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 text-sm font-bold">{actionModal.request.name?.charAt(0)}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{actionModal.request.name}</p>
                <p className="text-xs text-gray-500">{actionModal.request.email}</p>
              </div>
            </div>

            {actionModal.type === 'approve' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                This will create a login for <strong>{actionModal.request.name}</strong>. They can sign in immediately after approval.
              </div>
            )}

            <div>
              <label className="form-label">
                {actionModal.type === 'approve' ? 'Notes (optional)' : 'Reason for rejection (optional)'}
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder={actionModal.type === 'approve' ? 'e.g. Welcome to the team!' : 'e.g. Please contact HR directly...'}
                value={hrNotes}
                onChange={e => setHrNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActionModal(null)} className="btn-secondary flex-1">Cancel</button>
              {actionModal.type === 'approve' ? (
                <button
                  onClick={() => approveMutation.mutate({ id: actionModal.request.id, hr_notes: hrNotes })}
                  disabled={approveMutation.isPending}
                  className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700 focus:ring-green-500"
                >
                  <CheckCircle className="h-4 w-4" />
                  {approveMutation.isPending ? 'Approving…' : 'Approve'}
                </button>
              ) : (
                <button
                  onClick={() => rejectMutation.mutate({ id: actionModal.request.id, hr_notes: hrNotes })}
                  disabled={rejectMutation.isPending}
                  className="btn-danger flex-1 justify-center"
                >
                  <XCircle className="h-4 w-4" />
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Role change confirmation modal */}
      <Modal
        isOpen={!!roleModal}
        onClose={() => setRoleModal(null)}
        title="Change User Role"
        size="sm"
      >
        {roleModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Change <strong>{roleModal.user.name}</strong>'s role to{' '}
              <strong>{ROLE_LABELS[roleModal.newRole]?.label || roleModal.newRole}</strong>?
            </p>
            {roleModal.newRole === 'hr_admin' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                This gives full admin access including payroll, all employee data, and user management.
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setRoleModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => roleMutation.mutate({ id: roleModal.user.id, role: roleModal.newRole })}
                disabled={roleMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {roleMutation.isPending ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
