import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Download } from 'lucide-react';
import api from '../../api/client';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PayrollDetails() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: run, isLoading } = useQuery({
    queryKey: ['payroll-run', runId],
    queryFn: () => api.get(`/payroll/run/${runId}`).then((r) => r.data),
    enabled: !!runId,
  });

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

  const slips = run?.slips || [];

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
      header: 'LOP Days',
      accessor: 'lop_days',
      render: (val) => (
        <span className={val > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>{val ?? 0}</span>
      ),
    },
    {
      header: 'Basic',
      accessor: 'basic',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'HRA',
      accessor: 'hra',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'Other Earnings',
      accessor: 'other_earnings',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'Gross',
      accessor: 'gross',
      render: (val) => <span className="font-semibold text-gray-900">{formatCurrency(val)}</span>,
    },
    {
      header: 'EPF',
      accessor: 'epf_employee',
      render: (val) => <span className="text-red-600">{formatCurrency(val)}</span>,
    },
    {
      header: 'ESIC',
      accessor: 'esic_employee',
      render: (val) => <span className="text-red-600">{formatCurrency(val)}</span>,
    },
    {
      header: 'TDS',
      accessor: 'tds',
      render: (val) => <span className="text-red-600">{formatCurrency(val)}</span>,
    },
    {
      header: 'Total Deductions',
      accessor: 'deductions',
      render: (val) => <span className="font-semibold text-red-700">{formatCurrency(val)}</span>,
    },
    {
      header: 'Net Pay',
      accessor: 'net_pay',
      render: (val) => <span className="font-bold text-gray-900">{formatCurrency(val)}</span>,
    },
    {
      header: 'PDF',
      accessor: 'id',
      render: (val) => (
        <button
          className="btn-secondary py-1 px-2 text-xs"
          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(val); }}
          disabled={downloadingId === val}
        >
          {downloadingId === val ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </button>
      ),
    },
  ];

  const totalGross = slips.reduce((s, r) => s + (r.gross || 0), 0);
  const totalNet = slips.reduce((s, r) => s + (r.net_pay || 0), 0);
  const totalDeductions = slips.reduce((s, r) => s + (r.deductions || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button className="btn-secondary py-1.5 px-3" onClick={() => navigate('/payroll')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Run Details</h1>
          {run && (
            <p className="text-sm text-gray-500 mt-0.5">
              {run.month_label || `${run.month}/${run.year}`} &bull; Run on {formatDate(run.processed_at || run.created_at)}
            </p>
          )}
        </div>
        {run?.status && (
          <Badge label={run.status} status={run.status} />
        )}
      </div>

      {/* Summary Cards */}
      {!isLoading && slips.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: slips.length, sub: 'processed' },
            { label: 'Total Gross', value: formatCurrency(totalGross), sub: 'earnings' },
            { label: 'Total Deductions', value: formatCurrency(totalDeductions), sub: 'deducted' },
            { label: 'Total Net Pay', value: formatCurrency(totalNet), sub: 'disbursed', highlight: true },
          ].map(({ label, value, sub, highlight }) => (
            <div key={label} className={`card ${highlight ? 'bg-primary-50 border-primary-200' : ''}`}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-xl font-bold mt-1 ${highlight ? 'text-primary-700' : 'text-gray-900'}`}>
                {value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Employee Breakdown</h2>
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : (
          <Table
            columns={columns}
            data={slips}
            emptyMessage="No payslip data for this run"
          />
        )}
      </div>
    </div>
  );
}
