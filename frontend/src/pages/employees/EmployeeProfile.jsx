import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Edit, ArrowLeft, User, Briefcase, CreditCard, MapPin, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isHR } from '../../store/authStore';
import {
  formatDate,
  formatCurrency,
  getMonthOptions,
  getYearOptions,
  getCurrentMonth,
  getCurrentYear,
} from '../../utils/formatters';

const PROFILE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'salary-slips', label: 'Salary Slips' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave-balance', label: 'Leave Balance' },
];

function DetailItem({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="mt-0.5 flex-shrink-0 text-gray-400">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-sm text-gray-900 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        {Icon && <Icon className="h-4 w-4 text-primary-600" />}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SummaryCard({ label, value, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <div className={`rounded-lg border p-4 text-center ${colorMap[color] || colorMap.blue}`}>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
      <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const hrMode = isHR();
  const [activeTab, setActiveTab] = useState('overview');
  const [attendanceMonth, setAttendanceMonth] = useState(getCurrentMonth());
  const [attendanceYear, setAttendanceYear] = useState(getCurrentYear());
  const [downloadingSlipId, setDownloadingSlipId] = useState(null);
  const [createAccountModal, setCreateAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '' });

  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions(3);

  // Employee
  const {
    data: employee,
    isLoading: empLoading,
    isError: empError,
  } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/employees/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });

  // Salary slips
  const { data: salarySlips, isLoading: slipsLoading } = useQuery({
    queryKey: ['employee-salary-slips', id],
    queryFn: () => api.get(`/employees/${id}/payslips`).then((r) => r.data),
    enabled: activeTab === 'salary-slips' && Boolean(id),
    staleTime: 60_000,
  });

  // Attendance summary
  const { data: attendance, isLoading: attLoading } = useQuery({
    queryKey: ['employee-attendance', id, attendanceMonth, attendanceYear],
    queryFn: () =>
      api
        .get(`/attendance/employee/${id}/summary`, {
          params: { month: attendanceMonth, year: attendanceYear },
        })
        .then((r) => r.data.summary),
    enabled: activeTab === 'attendance' && Boolean(id),
  });

  // Leave balances
  const { data: leaveBalances, isLoading: leavesLoading } = useQuery({
    queryKey: ['employee-leave-balances', id],
    queryFn: () => api.get(`/leaves/balance/${id}`).then((r) => r.data.balances || []),
    enabled: activeTab === 'leave-balance' && Boolean(id),
    staleTime: 60_000,
  });

  const createAccountMutation = useMutation({
    mutationFn: (data) => api.post('/auth/create-employee-user', data),
    onSuccess: () => {
      toast.success('Employee account created');
      setCreateAccountModal(false);
      setAccountForm({ name: '', email: '', password: '' });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create account'),
  });

  const handleDownloadSlip = async (slipId) => {
    setDownloadingSlipId(slipId);
    try {
      const response = await api.get(`/payroll/slip/${slipId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `salary-slip-${slipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download salary slip. Please try again.');
    } finally {
      setDownloadingSlipId(null);
    }
  };

  if (empLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (empError || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <User className="h-12 w-12 text-gray-300" />
        <p className="text-sm">Employee not found.</p>
        <button
          onClick={() => navigate('/employees')}
          className="text-sm text-primary-600 hover:underline"
        >
          Back to Employees
        </button>
      </div>
    );
  }

  const fullName = `${employee.first_name} ${employee.last_name}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {hrMode && (
              <button
                onClick={() => navigate('/employees')}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary-700">
                {employee.first_name?.[0]?.toUpperCase()}{employee.last_name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
                <Badge status={employee.status} label={employee.status} />
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {employee.designation}
                {employee.department ? ` — ${employee.department}` : ''}
              </p>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                {employee.emp_id && (
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {employee.emp_id}
                  </span>
                )}
                {employee.joining_date && (
                  <span className="text-xs text-gray-500">
                    Joined {formatDate(employee.joining_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {hrMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAccountForm({ name: `${employee.first_name} ${employee.last_name}`, email: employee.email || '', password: '' });
                  setCreateAccountModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:border-green-400 hover:text-green-600 rounded-lg transition"
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </button>
              <Link
                to={`/employees/${id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:border-primary-400 hover:text-primary-600 rounded-lg transition"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ========== OVERVIEW ========== */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Personal Info */}
              <SectionCard title="Personal Information" icon={User}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailItem label="Full Name" value={fullName} />
                  <DetailItem label="Email" value={employee.email} />
                  <DetailItem label="Phone" value={employee.phone} />
                  <DetailItem label="Date of Birth" value={formatDate(employee.dob)} />
                  <DetailItem
                    label="Gender"
                    value={
                      employee.gender === 'M'
                        ? 'Male'
                        : employee.gender === 'F'
                        ? 'Female'
                        : employee.gender || '—'
                    }
                  />
                </div>
              </SectionCard>

              {/* Employment Info */}
              <SectionCard title="Employment Details" icon={Briefcase}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailItem label="Employee ID" value={employee.emp_id} />
                  <DetailItem label="Department" value={employee.department} />
                  <DetailItem label="Designation" value={employee.designation} />
                  <DetailItem label="Joining Date" value={formatDate(employee.joining_date)} />
                  <DetailItem
                    label="Employment Type"
                    value={
                      employee.employment_type
                        ? employee.employment_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                        : '—'
                    }
                  />
                  <DetailItem label="Manager" value={employee.manager_name || '—'} />
                </div>
              </SectionCard>

              {/* Bank & Compliance */}
              <SectionCard title="Bank & Compliance" icon={CreditCard}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailItem label="Bank Name" value={employee.bank_name} />
                  <DetailItem
                    label="Account Number"
                    value={
                      employee.bank_account_no
                        ? `••••${employee.bank_account_no.slice(-4)}`
                        : '—'
                    }
                  />
                  <DetailItem label="IFSC Code" value={employee.bank_ifsc} />
                  <DetailItem
                    label="PAN Number"
                    value={
                      employee.pan_number
                        ? `${employee.pan_number.slice(0, 2)}•••••${employee.pan_number.slice(-3)}`
                        : '—'
                    }
                  />
                  <DetailItem label="UAN Number" value={employee.uan_number} />
                </div>
              </SectionCard>

              {/* Address */}
              <SectionCard title="Address" icon={MapPin}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <DetailItem label="Street Address" value={employee.address} />
                  </div>
                  <DetailItem label="City" value={employee.city} />
                  <DetailItem label="State" value={employee.state} />
                  <DetailItem label="Pincode" value={employee.pincode} />
                  <DetailItem label="Metro City" value={employee.is_metro ? 'Yes' : 'No'} />
                </div>
              </SectionCard>
            </div>
          )}

          {/* ========== SALARY SLIPS ========== */}
          {activeTab === 'salary-slips' && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-4">Salary Slips</h2>
              {slipsLoading ? (
                <LoadingSpinner className="py-16" />
              ) : !salarySlips?.length ? (
                <div className="text-center py-16 text-sm text-gray-400">No salary slips available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {['Month / Year', 'Gross Pay', 'Net Pay', 'Status', 'Action'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {salarySlips.map((slip) => {
                        const run = slip.PayrollRun || {};
                        const month = run.month || slip.month;
                        const year = run.year || slip.year;
                        const slipStatus = run.status || slip.status;
                        const monthLabel = (() => {
                          if (month && year) {
                            return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                          }
                          return '—';
                        })();
                        return (
                          <tr key={slip.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3.5 text-sm text-gray-900 font-medium">{monthLabel}</td>
                            <td className="px-4 py-3.5 text-sm text-gray-700">{formatCurrency(slip.gross_pay)}</td>
                            <td className="px-4 py-3.5 text-sm text-gray-700">{formatCurrency(slip.net_pay)}</td>
                            <td className="px-4 py-3.5">
                              <Badge status={slipStatus} label={slipStatus} />
                            </td>
                            <td className="px-4 py-3.5">
                              <button
                                onClick={() => handleDownloadSlip(slip.id)}
                                disabled={downloadingSlipId === slip.id}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 border border-primary-200 hover:border-primary-400 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {downloadingSlipId === slip.id ? (
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                                Download PDF
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========== ATTENDANCE ========== */}
          {activeTab === 'attendance' && (
            <div>
              <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                <h2 className="text-base font-semibold text-gray-800">Attendance Summary</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={attendanceMonth}
                    onChange={(e) => setAttendanceMonth(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {monthOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={attendanceYear}
                    onChange={(e) => setAttendanceYear(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {yearOptions.map((y) => (
                      <option key={y.value} value={y.value}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {attLoading ? (
                <LoadingSpinner className="py-16" />
              ) : !attendance ? (
                <div className="text-center py-16 text-sm text-gray-400">No attendance data for this period.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <SummaryCard label="Present" value={attendance.present ?? 0} color="green" />
                  <SummaryCard label="Absent" value={attendance.absent ?? 0} color="red" />
                  <SummaryCard label="Half Day" value={attendance.half_day ?? 0} color="yellow" />
                  <SummaryCard label="Week Off" value={attendance.week_off ?? 0} color="blue" />
                  <SummaryCard label="Holiday" value={attendance.holiday ?? 0} color="blue" />
                  <SummaryCard label="Leave" value={attendance.leave ?? 0} color="blue" />
                  <SummaryCard label="LOP" value={attendance.lop ?? 0} color="purple" />
                  <SummaryCard label="Overtime" value={attendance.overtime ?? 0} color="green" />
                </div>
              )}
            </div>
          )}

          {/* ========== LEAVE BALANCE ========== */}
          {activeTab === 'leave-balance' && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-4">Leave Balances</h2>
              {leavesLoading ? (
                <LoadingSpinner className="py-16" />
              ) : !leaveBalances?.length ? (
                <div className="text-center py-16 text-sm text-gray-400">No leave balance data.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {['Leave Type', 'Allocated', 'Used', 'Balance'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaveBalances.map((lb, idx) => (
                        <tr key={lb.leave_type_id || idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                            <span>{lb.name || '—'}</span>
                            {lb.code && <span className="ml-1.5 text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{lb.code}</span>}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-700">{lb.allocated ?? '—'}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-700">{lb.used ?? '—'}</td>
                          <td className="px-4 py-3.5">
                            <span className={`text-sm font-semibold ${(lb.balance ?? 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {lb.balance ?? '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Account Modal */}
      <Modal isOpen={createAccountModal} onClose={() => setCreateAccountModal(false)} title="Create Employee Account" size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createAccountMutation.mutate({ employee_id: parseInt(id), ...accountForm });
          }}
          className="space-y-4"
        >
          <p className="text-sm text-gray-500">Create a login account for <strong>{employee?.first_name} {employee?.last_name}</strong> so they can access the app.</p>
          <div>
            <label className="form-label">Display Name *</label>
            <input className="form-input" value={accountForm.name} onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="form-label">Email *</label>
            <input type="email" className="form-input" value={accountForm.email} onChange={e => setAccountForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="form-label">Password *</label>
            <input type="password" className="form-input" placeholder="Min 6 characters" minLength={6} value={accountForm.password} onChange={e => setAccountForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setCreateAccountModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createAccountMutation.isPending} className="btn-primary flex-1 justify-center">
              {createAccountMutation.isPending ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
