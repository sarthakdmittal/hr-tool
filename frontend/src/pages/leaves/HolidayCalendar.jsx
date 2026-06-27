import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Trash2, Calendar } from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import { formatDate, getYearOptions, getCurrentYear } from '../../utils/formatters';

export default function HolidayCalendar() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(getCurrentYear());
  const [addModal, setAddModal] = useState(false);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => api.get('/holidays', { params: { year } }).then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const addMutation = useMutation({
    mutationFn: (data) => api.post('/holidays', data),
    onSuccess: () => {
      toast.success('Holiday added');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setAddModal(false);
      reset();
    },
    onError: () => toast.error('Failed to add holiday'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/holidays/${id}`),
    onSuccess: () => {
      toast.success('Holiday deleted');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: () => toast.error('Failed to delete holiday'),
  });

  const groupedByMonth = holidays.reduce((acc, h) => {
    const month = new Date(h.date).toLocaleString('default', { month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Manage public and company holidays</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="form-select w-28"
          >
            {getYearOptions(2).map(y => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
          <button onClick={() => setAddModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Holiday
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
        </div>
      ) : holidays.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No holidays found for {year}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(groupedByMonth).map(([month, items]) => (
            <div key={month} className="card p-0 overflow-hidden">
              <div className="px-4 py-3 bg-primary-600 text-white">
                <h3 className="font-semibold">{month} {year}</h3>
                <p className="text-xs text-primary-200">{items.length} holiday{items.length !== 1 ? 's' : ''}</p>
              </div>
              <ul className="divide-y divide-gray-100">
                {items.map(h => (
                  <li key={h.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{h.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(h.date, 'EEEE, dd MMM')}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete holiday "${h.name}"?`)) {
                          deleteMutation.mutate(h.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Add Holiday Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => { setAddModal(false); reset(); }}
        title="Add Holiday"
        size="sm"
        footer={
          <>
            <button onClick={() => { setAddModal(false); reset(); }} className="btn-secondary">Cancel</button>
            <button
              onClick={handleSubmit(data => addMutation.mutate({ ...data, year }))}
              disabled={addMutation.isPending}
              className="btn-primary"
            >
              {addMutation.isPending ? 'Adding...' : 'Add Holiday'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Holiday Name *</label>
            <input
              {...register('name', { required: 'Holiday name is required' })}
              className="form-input"
              placeholder="e.g. Republic Day"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Date *</label>
            <input
              type="date"
              {...register('date', { required: 'Date is required' })}
              className="form-input"
            />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
          </div>
          <div>
            <label className="form-label">Type</label>
            <select {...register('type')} className="form-select">
              <option value="national">National Holiday</option>
              <option value="regional">Regional Holiday</option>
              <option value="company">Company Holiday</option>
              <option value="optional">Optional Holiday</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
