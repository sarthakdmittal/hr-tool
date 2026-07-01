import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Play, Download, Eye, Trash2 } from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import Table from '../../components/Table';
import {
  formatCurrency,
  formatDate,
  getMonthOptions,
  getYearOptions,
  getCurrentMonth,
  getCurrentYear,
} from '../../utils/formatters';

function PayslipModal({ slip, onClose, onDownload, downloading }) {
  if (!slip) return null;

  const earnings = slip.earnings || [];
  const deductions = slip.deductions || [];
  const grossTotal = earnings.reduce((s, e) => s + (e.amount || 0), 0);
  const deductTotal = deductions.reduce((s, d) => s + (d.amount || 0), 0);
  const netPay = slip.net_pay ?? grossTotal - deductTotal;

  return (
    <div className="space-y-6 text-sm">
      {/* Header */}
      <div className="text-center border-b border-gray-200 pb-4">
        <h2 className="text-base font-bold text-gray-900">{slip.company_name || 'Company'}</h2>
        <p className="text-gray-500 mt-0.5">Payslip for {slip.month_label || `${slip.month}/${slip.year}`}</p>
      </div>

      {/* Employee Info */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
        <div>
          <p className="text-gray-400 text-xs">Employee Name</p>
          <p className="font-semibold text-gray-900">{slip.employee_name || slip.name}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Employee ID</p>
          <p className="font-semibold text-gray-900">{slip.emp_id}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Department</p>
          <p className="font-semibold text-gray-900">{slip.department || '—'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Designation</p>
          <p className="font-semibold text-gray-900">{slip.designation || '—'}</p>
        </div>
      </div>

      {/* Attendance Summary */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attendance</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Working Days', value: slip.working_days },
            { label: 'Paid Days', value: slip.paid_days },
            { label: 'LOP Days', value: slip.lop_days },
            { label: 'Leaves', value: slip.leave_days },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Earnings + Deductions side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Earnings</h3>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Component</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {earnings.map((e, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-700">{e.name}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-50">
                <tr>
                  <td className="px-3 py-2 font-semibold text-green-800">Gross Earnings</td>
                  <td className="px-3 py-2 text-right font-bold text-green-800">{formatCurrency(grossTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Deductions</h3>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Component</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deductions.map((d, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-700">{d.name}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-red-50">
                <tr>
                  <td className="px-3 py-2 font-semibold text-red-800">Total Deductions</td>
                  <td className="px-3 py-2 text-right font-bold text-red-800">{formatCurrency(deductTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Net Pay */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
        <p className="text-sm text-primary-600 font-medium">Net Pay</p>
        <p className="text-3xl font-bold text-primary-700 mt-1">{formatCurrency(netPay)}</p>
      </div>

      {/* Employer contributions */}
      {(slip.epf_employer || slip.esic_employer) && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Employer Contributions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">EPF Employer</p>
              <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(slip.epf_employer)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">ESIC Employer</p>
              <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(slip.esic_employer)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          className="btn-primary"
          onClick={onDownload}
          disabled={downloading}
        >
          {downloading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download PDF
        </button>
      </div>
    </div>
  );
}

export default function PayrollDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteRunModalOpen, setDeleteRunModalOpen] = useState(false);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedSlipId, setSelectedSlipId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll', selectedMonth, selectedYear],
    queryFn: () =>
      api.get('/payroll', { params: { month: selectedMonth, year: selectedYear } }).then((r) => r.data),
  });

  const { data: selectedSlip, isLoading: slipLoading } = useQuery({
    queryKey: ['payroll-slip', selectedSlipId],
    queryFn: () => api.get(`/payroll/slip/${selectedSlipId}`).then((r) => r.data),
    enabled: !!selectedSlipId,
  });

  const runPayrollMutation = useMutation({
    mutationFn: () => api.post('/payroll/run', { month: selectedMonth, year: selectedYear }),
    onSuccess: () => {
      toast.success('Payroll processed successfully');
      setConfirmModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payroll', selectedMonth, selectedYear] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to run payroll');
    },
  });

  const deleteRunMutation = useMutation({
    mutationFn: (runId) => api.delete(`/payroll/runs/${runId}`),
    onSuccess: () => {
      toast.success('Payroll run deleted');
      setDeleteRunModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payroll', selectedMonth, selectedYear] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete payroll run');
    },
  });

  const handleViewSlip = (slipId) => {
    setSelectedSlipId(slipId);
    setSlipModalOpen(true);
  };

  const handleDownloadPDF = async (slipId) => {
    setDownloadingId(slipId);
    try {
      const response = await api.get(`/payroll/slip/${slipId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${slipId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const slips = payrollData?.slips || payrollData || [];
  const runInfo = payrollData?.run_info || null;

  const monthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label || '';

  const columns = [
    {
      header: 'Employee',
      accessor: 'employee_name',
      render: (val, row) => (
        <div>
          <div className="font-medium text-gray-900">{val || row.name}</div>
          <div className="text-xs text-gray-400">{row.emp_id}</div>
        </div>
      ),
    },
    { header: 'Department', accessor: 'department', render: (val) => val || '—' },
    {
      header: 'Paid Days',
      accessor: 'paid_days',
      render: (val) => <span className="font-medium">{val ?? '—'}</span>,
    },
    {
      header: 'Gross',
      accessor: 'gross',
      render: (val) => <span className="text-gray-900">{formatCurrency(val)}</span>,
    },
    {
      header: 'Deductions',
      accessor: 'deductions',
      render: (val) => <span className="text-red-600">{formatCurrency(val)}</span>,
    },
    {
      header: 'Net Pay',
      accessor: 'net_pay',
      render: (val) => <span className="font-bold text-gray-900">{formatCurrency(val)}</span>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary py-1 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); handleViewSlip(val || row.id); }}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          <button
            className="btn-secondary py-1 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(val || row.id); }}
            disabled={downloadingId === (val || row.id)}
          >
            {downloadingId === (val || row.id) ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            PDF
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-0.5">Process and manage employee payroll</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="form-label">Month</label>
            <select
              className="form-select w-36"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Year</label>
            <select
              className="form-select w-28"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary px-6"
            onClick={() => setConfirmModalOpen(true)}
          >
            <Play className="h-4 w-4" />
            Run Payroll
          </button>
          {runInfo && (
            <>
              <Badge label={runInfo.status} status={runInfo.status} />
              {runInfo.status !== 'locked' && (
                <button
                  className="btn-danger px-4"
                  onClick={() => setDeleteRunModalOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Run
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-700">
            Payroll for {monthLabel} {selectedYear}
          </h2>
          {slips.length > 0 && (
            <span className="text-sm text-gray-400">{slips.length} employees</span>
          )}
        </div>
        {payrollLoading ? (
          <LoadingSpinner className="py-16" />
        ) : (
          <Table
            columns={columns}
            data={Array.isArray(slips) ? slips : []}
            emptyMessage="No payroll data. Run payroll to generate payslips."
            onRowClick={(row) => navigate(`/payroll/${row.run_id || row.id}`)}
          />
        )}
      </div>

      {/* Confirm Run Payroll Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Run Payroll"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={() => runPayrollMutation.mutate()}
              disabled={runPayrollMutation.isPending}
            >
              {runPayrollMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Confirm & Run
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-gray-700">
            Run payroll for{' '}
            <span className="font-semibold">
              {monthLabel} {selectedYear}
            </span>
            ?
          </p>
          <p className="text-sm text-gray-500">
            This will calculate salaries for all active employees based on their attendance and salary
            structure. Any existing payroll run for this period will be overwritten.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
            Ensure attendance is finalized before running payroll.
          </div>
        </div>
      </Modal>

      {/* Delete Run Modal */}
      <Modal
        isOpen={deleteRunModalOpen}
        onClose={() => setDeleteRunModalOpen(false)}
        title="Delete Payroll Run"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteRunModalOpen(false)}>Cancel</button>
            <button
              className="btn-danger"
              onClick={() => deleteRunMutation.mutate(runInfo?.id)}
              disabled={deleteRunMutation.isPending}
            >
              {deleteRunMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          </>
        }
      >
        <p className="text-gray-700">
          Delete payroll run for <span className="font-semibold">{monthLabel} {selectedYear}</span>?
        </p>
        <p className="text-sm text-gray-500 mt-1">
          All payslips for this period will be permanently removed. This cannot be undone.
        </p>
      </Modal>

      {/* View Slip Modal */}
      <Modal
        isOpen={slipModalOpen}
        onClose={() => { setSlipModalOpen(false); setSelectedSlipId(null); }}
        title="Payslip"
        size="xl"
      >
        {slipLoading ? (
          <LoadingSpinner className="py-12" />
        ) : (
          <PayslipModal
            slip={selectedSlip}
            onClose={() => { setSlipModalOpen(false); setSelectedSlipId(null); }}
            onDownload={() => handleDownloadPDF(selectedSlipId)}
            downloading={downloadingId === selectedSlipId}
          />
        )}
      </Modal>
    </div>
  );
}
