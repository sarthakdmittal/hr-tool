import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Users, Layers } from 'lucide-react';
import api from '../../api/client';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SalaryStructures() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: structures = [], isLoading } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: () => api.get('/salary-structures').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/salary-structures/${id}`),
    onSuccess: () => {
      toast.success('Salary structure deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries(['salary-structures']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete structure');
    },
  });

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-medium text-gray-900">{val}</div>
          {row.description && (
            <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Employees Assigned',
      accessor: 'employee_count',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-gray-700">
          <Users className="h-3.5 w-3.5 text-gray-400" />
          <span>{val ?? 0}</span>
        </div>
      ),
    },
    {
      header: 'Components',
      accessor: 'components_count',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-gray-700">
          <Layers className="h-3.5 w-3.5 text-gray-400" />
          <span>{val ?? 0}</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary py-1 px-2.5 text-xs"
            onClick={(e) => { e.stopPropagation(); navigate(`/salary-structures/${val}/edit`); }}
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            className="btn-danger py-1 px-2.5 text-xs"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Structures</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define pay components and structures for employees</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/salary-structures/new')}>
          <Plus className="h-4 w-4" />
          Create New Structure
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : (
          <Table
            columns={columns}
            data={structures}
            emptyMessage="No salary structures found. Create one to get started."
            onRowClick={(row) => navigate(`/salary-structures/${row.id}/edit`)}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Salary Structure"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-gray-700">
            Are you sure you want to delete{' '}
            <span className="font-semibold">&ldquo;{deleteTarget?.name}&rdquo;</span>?
          </p>
          {deleteTarget?.employee_count > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
              Warning: {deleteTarget.employee_count} employee(s) are assigned to this structure.
            </div>
          )}
          <p className="text-sm text-gray-400">This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
}
