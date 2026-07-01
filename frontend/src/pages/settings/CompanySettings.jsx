import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Save, Building2, Shield, CreditCard, Globe, Layers, Briefcase, Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
        <div className="p-2 bg-primary-50 rounded-lg">
          <Icon className="h-5 w-5 text-primary-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function DepartmentsSection() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (name) => api.post('/departments', { name }),
    onSuccess: () => {
      toast.success('Department added');
      setNewName('');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add department'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      toast.success('Department deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete department'),
  });

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="form-input flex-1"
            placeholder="New department name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newName.trim()) createMutation.mutate(newName.trim()); } }}
          />
          <button
            type="button"
            className="btn-primary px-4"
            disabled={!newName.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate(newName.trim())}
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {isLoading ? (
          <LoadingSpinner className="py-4" />
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
            {departments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No departments yet</p>
            ) : departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50">
                <span className="text-sm text-gray-800">{dept.name}</span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(dept)}
                  className="text-red-500 hover:text-red-700 p-1 rounded transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Department"
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
        <p className="text-gray-700">Delete department <span className="font-semibold">{deleteTarget?.name}</span>?</p>
        <p className="text-sm text-gray-500 mt-1">Employees assigned to this department will lose their department association.</p>
      </Modal>
    </>
  );
}

function DesignationsSection() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: designations = [], isLoading } = useQuery({
    queryKey: ['designations'],
    queryFn: () => api.get('/designations').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (name) => api.post('/designations', { name }),
    onSuccess: () => {
      toast.success('Designation added');
      setNewName('');
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add designation'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/designations/${id}`),
    onSuccess: () => {
      toast.success('Designation deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete designation'),
  });

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="form-input flex-1"
            placeholder="New designation name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newName.trim()) createMutation.mutate(newName.trim()); } }}
          />
          <button
            type="button"
            className="btn-primary px-4"
            disabled={!newName.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate(newName.trim())}
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {isLoading ? (
          <LoadingSpinner className="py-4" />
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
            {designations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No designations yet</p>
            ) : designations.map((desig) => (
              <div key={desig.id} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50">
                <span className="text-sm text-gray-800">{desig.name}</span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(desig)}
                  className="text-red-500 hover:text-red-700 p-1 rounded transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Designation"
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
        <p className="text-gray-700">Delete designation <span className="font-semibold">{deleteTarget?.name}</span>?</p>
        <p className="text-sm text-gray-500 mt-1">Employees with this designation will lose their designation association.</p>
      </Modal>
    </>
  );
}

export default function CompanySettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm();

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings, reset]);

  const mutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => toast.success('Settings saved successfully'),
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading) return <LoadingSpinner className="py-20" />;

  return (
    <>
    <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your organization details and compliance settings</p>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending || !isDirty}
          className="btn-primary"
        >
          <Save className="h-4 w-4" />
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Company Info */}
      <Section title="Company Information" icon={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Company Name *</label>
            <input {...register('name', { required: true })} className="form-input" placeholder="Acme Corp Pvt Ltd" />
          </div>
          <div>
            <label className="form-label">Industry</label>
            <input {...register('industry')} className="form-input" placeholder="Technology" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input type="email" {...register('email')} className="form-input" placeholder="hr@company.com" />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input {...register('phone')} className="form-input" placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="form-label">Website</label>
            <input {...register('website')} className="form-input" placeholder="https://company.com" />
          </div>
          <div>
            <label className="form-label">Founded Year</label>
            <input type="number" {...register('founded_year')} className="form-input" placeholder="2020" />
          </div>
          <div className="col-span-2">
            <label className="form-label">Registered Address</label>
            <textarea {...register('address')} rows={2} className="form-input" placeholder="Full registered address" />
          </div>
          <div>
            <label className="form-label">City</label>
            <input {...register('city')} className="form-input" />
          </div>
          <div>
            <label className="form-label">State</label>
            <input {...register('state')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Pincode</label>
            <input {...register('pincode')} className="form-input" />
          </div>
        </div>
      </Section>

      {/* Tax & Compliance */}
      <Section title="Tax & Compliance" icon={Shield}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">PAN Number</label>
            <input {...register('pan_number')} className="form-input" placeholder="AABCC1234D" />
          </div>
          <div>
            <label className="form-label">TAN Number</label>
            <input {...register('tan_number')} className="form-input" placeholder="MUMA12345B" />
          </div>
          <div>
            <label className="form-label">GSTIN</label>
            <input {...register('gstin')} className="form-input" placeholder="27AABCC1234D1Z5" />
          </div>
          <div>
            <label className="form-label">CIN</label>
            <input {...register('cin')} className="form-input" placeholder="U74999MH2020PTC123456" />
          </div>
          <div>
            <label className="form-label">EPF Registration Number</label>
            <input {...register('epf_number')} className="form-input" placeholder="MH/MUM/1234567" />
          </div>
          <div>
            <label className="form-label">ESIC Registration Number</label>
            <input {...register('esic_number')} className="form-input" placeholder="31000123456789010" />
          </div>
          <div>
            <label className="form-label">PT Registration Number</label>
            <input {...register('pt_number')} className="form-input" />
          </div>
          <div>
            <label className="form-label">LWF Registration Number</label>
            <input {...register('lwf_number')} className="form-input" />
          </div>
        </div>
      </Section>

      {/* Payroll Settings */}
      <Section title="Payroll Configuration" icon={CreditCard}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Payroll Processing Day</label>
            <select {...register('payroll_day')} className="form-select">
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of every month</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Working Days Per Month</label>
            <input type="number" {...register('working_days')} className="form-input" defaultValue={26} min={20} max={31} />
          </div>
          <div>
            <label className="form-label">EPF Employer Rate (%)</label>
            <input type="number" step="0.01" {...register('epf_employer_rate')} className="form-input" defaultValue={12} />
          </div>
          <div>
            <label className="form-label">ESIC Employer Rate (%)</label>
            <input type="number" step="0.01" {...register('esic_employer_rate')} className="form-input" defaultValue={3.25} />
          </div>
          <div>
            <label className="form-label">ESIC Employee Rate (%)</label>
            <input type="number" step="0.01" {...register('esic_employee_rate')} className="form-input" defaultValue={0.75} />
          </div>
          <div>
            <label className="form-label">EPF Wage Ceiling (₹)</label>
            <input type="number" {...register('epf_ceiling')} className="form-input" defaultValue={15000} />
          </div>
          <div>
            <label className="form-label">ESIC Wage Ceiling (₹)</label>
            <input type="number" {...register('esic_ceiling')} className="form-input" defaultValue={21000} />
          </div>
          <div>
            <label className="form-label">Gratuity Enabled</label>
            <select {...register('gratuity_enabled')} className="form-select">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Locale Settings */}
      <Section title="Locale & Format" icon={Globe}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Currency</label>
            <select {...register('currency')} className="form-select">
              <option value="INR">INR (₹) — Indian Rupee</option>
              <option value="USD">USD ($) — US Dollar</option>
            </select>
          </div>
          <div>
            <label className="form-label">Date Format</label>
            <select {...register('date_format')} className="form-select">
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="form-label">Fiscal Year Start</label>
            <select {...register('fiscal_year_start')} className="form-select">
              <option value="04">April (Indian FY)</option>
              <option value="01">January</option>
            </select>
          </div>
        </div>
      </Section>
    </form>

    {/* Departments & Designations — outside form to avoid submit conflicts */}
    <div className="space-y-6 max-w-4xl">
      <Section title="Departments" icon={Layers}>
        <DepartmentsSection />
      </Section>

      <Section title="Designations" icon={Briefcase}>
        <DesignationsSection />
      </Section>
    </div>
    </>
  );
}
