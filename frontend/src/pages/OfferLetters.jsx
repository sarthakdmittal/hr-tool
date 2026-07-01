import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Download, Trash2, FileText, X } from 'lucide-react';
import api from '../api/client';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { formatDate, formatCurrency } from '../utils/formatters';

const STATUS_COLORS = {
  draft: 'gray', sent: 'blue', accepted: 'green', rejected: 'red', expired: 'orange'
};

export default function OfferLetters() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: offerLetters = [], isLoading } = useQuery({
    queryKey: ['offer-letters'],
    queryFn: () => api.get('/offer-letters').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { probation_period: 6, notice_period: 2 }
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/offer-letters/generate', data),
    onSuccess: () => {
      toast.success('Offer letter created');
      setCreateOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create offer letter'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/offer-letters/${id}`),
    onSuccess: () => {
      toast.success('Offer letter deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete'),
  });

  const handleDownload = async (id, name) => {
    setDownloadingId(id);
    try {
      const res = await api.get(`/offer-letters/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `offer_letter_${name.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const onSubmit = (data) => {
    createMutation.mutate({
      ...data,
      ctc: parseFloat(data.ctc),
      probation_period: parseInt(data.probation_period),
      notice_period: parseInt(data.notice_period),
    });
  };

  const columns = [
    {
      header: 'Candidate',
      accessor: 'candidate_name',
      render: (val, row) => (
        <div>
          <div className="font-medium text-gray-900">{val}</div>
          {row.candidate_email && <div className="text-xs text-gray-400">{row.candidate_email}</div>}
        </div>
      ),
    },
    { header: 'Designation', accessor: 'designation' },
    { header: 'Department', accessor: 'department' },
    {
      header: 'CTC',
      accessor: 'ctc',
      render: (val) => <span className="font-medium">₹{formatCurrency(val)}</span>,
    },
    {
      header: 'Joining Date',
      accessor: 'joining_date',
      render: (val) => formatDate(val),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => <Badge label={val} status={STATUS_COLORS[val] || 'gray'} />,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary py-1 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); handleDownload(val, row.candidate_name); }}
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
          <h1 className="text-2xl font-bold text-gray-900">Offer Letters</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and manage offer letters for candidates</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Offer Letter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={offerLetters}
          loading={isLoading}
          emptyMessage="No offer letters yet. Create your first one."
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); reset(); }}
        title="New Offer Letter"
        size="xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setCreateOpen(false); reset(); }}>
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Generate
            </button>
          </>
        }
      >
        <form className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="form-label">Candidate Name *</label>
            <input {...register('candidate_name', { required: true })} className="form-input" placeholder="John Doe" />
            {errors.candidate_name && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div>
            <label className="form-label">Candidate Email</label>
            <input type="email" {...register('candidate_email')} className="form-input" placeholder="john@example.com" />
          </div>
          <div>
            <label className="form-label">Designation *</label>
            <input {...register('designation', { required: true })} className="form-input" placeholder="Software Engineer" />
            {errors.designation && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div>
            <label className="form-label">Department *</label>
            <input {...register('department', { required: true })} className="form-input" placeholder="Engineering" />
            {errors.department && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div>
            <label className="form-label">Annual CTC (₹) *</label>
            <input type="number" {...register('ctc', { required: true, min: 1 })} className="form-input" placeholder="600000" />
            {errors.ctc && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div>
            <label className="form-label">Joining Date *</label>
            <input type="date" {...register('joining_date', { required: true })} className="form-input" />
            {errors.joining_date && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div>
            <label className="form-label">Offer Date</label>
            <input type="date" {...register('offer_date')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Valid Till</label>
            <input type="date" {...register('valid_till')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Reporting Manager</label>
            <input {...register('reporting_manager')} className="form-input" placeholder="Manager Name" />
          </div>
          <div>
            <label className="form-label">Probation Period (months)</label>
            <input type="number" {...register('probation_period')} className="form-input" min={0} max={24} />
          </div>
          <div>
            <label className="form-label">Notice Period (months)</label>
            <input type="number" {...register('notice_period')} className="form-input" min={0} max={12} />
          </div>
          <div className="col-span-2">
            <label className="form-label">Candidate Address</label>
            <textarea {...register('candidate_address')} className="form-input" rows={2} placeholder="Full address" />
          </div>
          <div className="col-span-2">
            <label className="form-label">Additional Terms</label>
            <textarea {...register('additional_terms')} className="form-input" rows={2} placeholder="Any special terms or conditions..." />
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Offer Letter"
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
        <p className="text-gray-700">Delete offer letter for <span className="font-semibold">{deleteTarget?.candidate_name}</span>?</p>
        <p className="text-sm text-gray-500 mt-1">This cannot be undone.</p>
      </Modal>
    </div>
  );
}
