import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Download, Trash2, FileText, X } from 'lucide-react';
import api from '../api/client';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { formatDate } from '../utils/formatters';

const STATUS_OPTIONS = ['submitted', 'accepted', 'rejected', 'withdrawn'];
const STATUS_COLORS = { submitted: 'blue', accepted: 'green', rejected: 'red', withdrawn: 'gray' };

export default function Resignations() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: resignations = [], isLoading } = useQuery({
    queryKey: ['resignations'],
    queryFn: () => api.get('/resignations').then(r => r.data),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => api.get('/employees?status=active').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/resignations', data),
    onSuccess: () => {
      toast.success('Resignation letter created');
      setCreateOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/resignations/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/resignations/${id}`),
    onSuccess: () => {
      toast.success('Resignation deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete'),
  });

  const handleDownload = async (id, empName) => {
    setDownloadingId(id);
    try {
      const res = await api.get(`/resignations/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `resignation_${empName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const columns = [
    {
      header: 'Employee',
      accessor: 'Employee',
      render: (val) => val ? (
        <div>
          <div className="font-medium text-gray-900">{val.first_name} {val.last_name}</div>
          <div className="text-xs text-gray-400">{val.emp_id}</div>
        </div>
      ) : '—',
    },
    {
      header: 'Department',
      accessor: 'Employee',
      render: (val) => val?.Department?.name || '—',
    },
    {
      header: 'Resignation Date',
      accessor: 'resignation_date',
      render: (val) => formatDate(val),
    },
    {
      header: 'Last Working Day',
      accessor: 'last_working_date',
      render: (val) => formatDate(val),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val, row) => (
        <select
          value={val}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => statusMutation.mutate({ id: row.id, status: e.target.value })}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary py-1 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); handleDownload(val, `${row.Employee?.first_name}_${row.Employee?.last_name}`); }}
            disabled={downloadingId === val}
          >
            {downloadingId === val ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            PDF
          </button>
          <button
            className="btn-danger py-1 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resignations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage employee resignation letters</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Resignation
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={resignations}
          loading={isLoading}
          emptyMessage="No resignation letters yet."
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); reset(); }}
        title="New Resignation Letter"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setCreateOpen(false); reset(); }}>
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit(data => createMutation.mutate(data))}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Create
            </button>
          </>
        }
      >
        <form className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="form-label">Employee *</label>
            <select {...register('employee_id', { required: true })} className="form-select">
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.emp_id})
                </option>
              ))}
            </select>
            {errors.employee_id && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div>
            <label className="form-label">Resignation Date *</label>
            <input type="date" {...register('resignation_date', { required: true })} className="form-input" />
            {errors.resignation_date && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div>
            <label className="form-label">Last Working Date *</label>
            <input type="date" {...register('last_working_date', { required: true })} className="form-input" />
            {errors.last_working_date && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="waived" {...register('notice_period_waived')} className="h-4 w-4 rounded" />
            <label htmlFor="waived" className="text-sm text-gray-700">Notice period waived</label>
          </div>
          <div className="col-span-2">
            <label className="form-label">Reason for Resignation</label>
            <textarea
              {...register('reason')}
              className="form-input"
              rows={3}
              placeholder="Optional — will be included in the letter if provided"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Resignation"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button
              className="btn-danger"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </>
        }
      >
        <p className="text-gray-700">
          Delete resignation letter for <span className="font-semibold">{deleteTarget?.Employee?.first_name} {deleteTarget?.Employee?.last_name}</span>?
        </p>
        <p className="text-sm text-gray-500 mt-1">This cannot be undone.</p>
      </Modal>
    </div>
  );
}
