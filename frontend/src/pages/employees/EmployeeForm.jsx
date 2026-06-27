import { useEffect, useState, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronRight, Save, ArrowLeft } from 'lucide-react';
import api from '../../api/client';

const TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'employment', label: 'Employment' },
  { id: 'salary', label: 'Salary' },
  { id: 'bank', label: 'Bank & Compliance' },
  { id: 'address', label: 'Address' },
];

function FormField({ label, error, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
    </div>
  );
}

const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${
        props['aria-invalid'] ? 'border-red-400 bg-red-50' : 'border-gray-300'
      } ${className}`}
      {...props}
    />
  );
});

const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [activeTab, setActiveTab] = useState('personal');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      dob: '',
      gender: '',
      emp_id: '',
      joining_date: '',
      department: '',
      designation: '',
      employment_type: 'full_time',
      manager_id: '',
      salary_structure_id: '',
      ctc: '',
      bank_account_no: '',
      bank_ifsc: '',
      bank_name: '',
      pan_number: '',
      aadhaar_number: '',
      uan_number: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      is_metro: false,
    },
  });

  // Fetch employee for edit mode
  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/employees/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  // Populate form when employee loads
  useEffect(() => {
    if (employee) {
      reset({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        dob: employee.dob ? employee.dob.split('T')[0] : '',
        gender: employee.gender || '',
        emp_id: employee.emp_id || '',
        joining_date: employee.joining_date ? employee.joining_date.split('T')[0] : '',
        department: employee.department || '',
        designation: employee.designation || '',
        employment_type: employee.employment_type || 'full_time',
        manager_id: employee.manager_id ? String(employee.manager_id) : '',
        salary_structure_id: employee.salary_structure_id ? String(employee.salary_structure_id) : '',
        ctc: employee.ctc != null ? String(employee.ctc) : '',
        bank_account_no: employee.bank_account_no || '',
        bank_ifsc: employee.bank_ifsc || '',
        bank_name: employee.bank_name || '',
        pan_number: employee.pan_number || '',
        aadhaar_number: employee.aadhaar_number || '',
        uan_number: employee.uan_number || '',
        address: employee.address || '',
        city: employee.city || '',
        state: employee.state || '',
        pincode: employee.pincode || '',
        is_metro: employee.is_metro || false,
      });
    }
  }, [employee, reset]);

  // Salary structures
  const { data: salaryStructures } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: () => api.get('/salary-structures').then((r) => r.data),
    staleTime: 300_000,
  });

  // Employees for manager dropdown
  const { data: allEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then((r) => r.data),
    staleTime: 60_000,
  });

  const managerOptions = (allEmployees || []).filter((e) => !id || String(e.id) !== String(id));

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        dob: data.dob || null,
        joining_date: data.joining_date || null,
        gender: data.gender || null,
        employment_type: data.employment_type || null,
        ctc: data.ctc !== '' ? Number(data.ctc) : null,
        salary_structure_id: data.salary_structure_id !== '' ? Number(data.salary_structure_id) : null,
        manager_id: data.manager_id !== '' ? Number(data.manager_id) : null,
        is_metro: Boolean(data.is_metro),
      };
      return isEdit
        ? api.put(`/employees/${id}`, payload)
        : api.post('/employees', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Employee updated successfully.' : 'Employee created successfully.');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['employee', id] });
      navigate('/employees');
    },
    onError: (err) => {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save employee. Please check the form and try again.';
      toast.error(message);
    },
  });

  const onSubmit = (data) => {
    saveMutation.mutate(data);
  };

  const tabHasError = (tabId) => {
    const tabFields = {
      personal: ['first_name', 'last_name', 'email'],
      employment: ['emp_id', 'joining_date', 'department', 'designation'],
      salary: [],
      bank: [],
      address: [],
    };
    return (tabFields[tabId] || []).some((f) => errors[f]);
  };

  if (isEdit && empLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Employee' : 'Add Employee'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit
              ? `Editing: ${employee?.first_name} ${employee?.last_name}`
              : 'Fill in the details to create a new employee record.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {TABS.map((tab, idx) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : tabHasError(tab.id)
                    ? 'border-red-400 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold">
                  {idx + 1}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* --- Personal --- */}
            {activeTab === 'personal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="First Name" required error={errors.first_name}>
                  <Input
                    placeholder="John"
                    aria-invalid={!!errors.first_name}
                    {...register('first_name', { required: 'First name is required' })}
                  />
                </FormField>
                <FormField label="Last Name" required error={errors.last_name}>
                  <Input
                    placeholder="Doe"
                    aria-invalid={!!errors.last_name}
                    {...register('last_name', { required: 'Last name is required' })}
                  />
                </FormField>
                <FormField label="Email Address" required error={errors.email}>
                  <Input
                    type="email"
                    placeholder="john.doe@company.com"
                    aria-invalid={!!errors.email}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                  />
                </FormField>
                <FormField label="Phone Number" error={errors.phone}>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    {...register('phone')}
                  />
                </FormField>
                <FormField label="Date of Birth" error={errors.dob}>
                  <Input type="date" {...register('dob')} />
                </FormField>
                <FormField label="Gender" error={errors.gender}>
                  <Select {...register('gender')}>
                    <option value="">Select gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </FormField>
              </div>
            )}

            {/* --- Employment --- */}
            {activeTab === 'employment' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Employee ID" required error={errors.emp_id}>
                  <Input
                    placeholder="EMP001"
                    aria-invalid={!!errors.emp_id}
                    {...register('emp_id', { required: 'Employee ID is required' })}
                  />
                </FormField>
                <FormField label="Joining Date" required error={errors.joining_date}>
                  <Input
                    type="date"
                    aria-invalid={!!errors.joining_date}
                    {...register('joining_date', { required: 'Joining date is required' })}
                  />
                </FormField>
                <FormField label="Department" required error={errors.department}>
                  <Input
                    placeholder="Engineering"
                    aria-invalid={!!errors.department}
                    {...register('department', { required: 'Department is required' })}
                  />
                </FormField>
                <FormField label="Designation" required error={errors.designation}>
                  <Input
                    placeholder="Software Engineer"
                    aria-invalid={!!errors.designation}
                    {...register('designation', { required: 'Designation is required' })}
                  />
                </FormField>
                <FormField label="Employment Type" error={errors.employment_type}>
                  <Select {...register('employment_type')}>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                  </Select>
                </FormField>
                <FormField label="Reporting Manager" error={errors.manager_id}>
                  <Select {...register('manager_id')}>
                    <option value="">No manager</option>
                    {managerOptions.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} {e.emp_id ? `(${e.emp_id})` : ''}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
            )}

            {/* --- Salary --- */}
            {activeTab === 'salary' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Salary Structure" error={errors.salary_structure_id}>
                  <Select {...register('salary_structure_id')}>
                    <option value="">Select a structure</option>
                    {(salaryStructures || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="CTC (Annual)" error={errors.ctc}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      ₹
                    </span>
                    <Input
                      type="number"
                      placeholder="600000"
                      className="pl-7"
                      min="0"
                      step="1000"
                      {...register('ctc', {
                        min: { value: 0, message: 'CTC cannot be negative' },
                      })}
                    />
                  </div>
                </FormField>
              </div>
            )}

            {/* --- Bank & Compliance --- */}
            {activeTab === 'bank' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Bank Account Number" error={errors.bank_account_no}>
                  <Input
                    placeholder="123456789012"
                    {...register('bank_account_no')}
                  />
                </FormField>
                <FormField label="IFSC Code" error={errors.bank_ifsc}>
                  <Input
                    placeholder="SBIN0001234"
                    className="uppercase"
                    {...register('bank_ifsc', {
                      pattern: {
                        value: /^[A-Z]{4}0[A-Z0-9]{6}$/i,
                        message: 'Enter a valid IFSC code (e.g. SBIN0001234)',
                      },
                    })}
                  />
                </FormField>
                <FormField label="Bank Name" error={errors.bank_name}>
                  <Input placeholder="State Bank of India" {...register('bank_name')} />
                </FormField>
                <FormField label="PAN Number" error={errors.pan_number}>
                  <Input
                    placeholder="ABCDE1234F"
                    className="uppercase"
                    {...register('pan_number', {
                      pattern: {
                        value: /^[A-Z]{5}[0-9]{4}[A-Z]$/i,
                        message: 'Enter a valid PAN (e.g. ABCDE1234F)',
                      },
                    })}
                  />
                </FormField>
                <FormField label="Aadhaar Number" error={errors.aadhaar_number}>
                  <Input
                    placeholder="1234 5678 9012"
                    {...register('aadhaar_number', {
                      pattern: {
                        value: /^\d{12}$/,
                        message: 'Aadhaar must be 12 digits',
                      },
                    })}
                  />
                </FormField>
                <FormField label="UAN Number" error={errors.uan_number}>
                  <Input
                    placeholder="100123456789"
                    {...register('uan_number', {
                      pattern: {
                        value: /^\d{12}$/,
                        message: 'UAN must be 12 digits',
                      },
                    })}
                  />
                </FormField>
              </div>
            )}

            {/* --- Address --- */}
            {activeTab === 'address' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <FormField label="Address" error={errors.address}>
                    <textarea
                      rows={3}
                      placeholder="Street address, area, landmark…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none"
                      {...register('address')}
                    />
                  </FormField>
                </div>
                <FormField label="City" error={errors.city}>
                  <Input placeholder="Mumbai" {...register('city')} />
                </FormField>
                <FormField label="State" error={errors.state}>
                  <Input placeholder="Maharashtra" {...register('state')} />
                </FormField>
                <FormField label="Pincode" error={errors.pincode}>
                  <Input
                    placeholder="400001"
                    {...register('pincode', {
                      pattern: {
                        value: /^\d{6}$/,
                        message: 'Pincode must be 6 digits',
                      },
                    })}
                  />
                </FormField>
                <div className="flex items-start gap-3 pt-1">
                  <input
                    id="is_metro"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    {...register('is_metro')}
                  />
                  <label htmlFor="is_metro" className="cursor-pointer">
                    <span className="block text-sm font-medium text-gray-700">Metro City</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Affects HRA calculation (50% of Basic for metro, 40% for non-metro)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
            {/* Tab navigation hints */}
            <div className="flex items-center gap-2">
              {TABS.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-2 h-2 rounded-full transition ${
                    activeTab === tab.id ? 'bg-primary-600' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to ${tab.label} tab`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/employees')}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-lg transition"
              >
                Cancel
              </button>

              {/* Next tab button */}
              {activeTab !== 'address' && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = TABS.findIndex((t) => t.id === activeTab);
                    if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-300 hover:border-primary-400 rounded-lg transition"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition shadow-sm"
              >
                {saveMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEdit ? 'Save Changes' : 'Create Employee'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
