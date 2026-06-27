import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, Calculator } from 'lucide-react';
import api from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';

const COMPONENT_TYPE_OPTIONS = [
  { value: 'pct_ctc', label: '% of CTC' },
  { value: 'pct_basic', label: '% of Basic' },
  { value: 'fixed', label: 'Fixed Amount' },
];

const DEFAULT_EARNINGS = [
  { name: 'Basic Salary', code: 'BASIC', type: 'pct_ctc', value: 40, taxable: true },
  { name: 'HRA', code: 'HRA', type: 'pct_basic', value: 50, taxable: false },
  { name: 'Travel Allowance', code: 'TRAVEL', type: 'fixed', value: 1600, taxable: false },
  { name: 'Medical Allowance', code: 'MEDICAL', type: 'fixed', value: 1250, taxable: false },
  { name: 'Special Allowance', code: 'SPECIAL', type: 'special_balance', value: 0, taxable: true },
];

const DEFAULT_DEDUCTIONS = [
  { name: 'EPF Employee', code: 'EPF_EMP', type: 'pct_basic', value: 12, taxable: false },
  { name: 'ESIC Employee', code: 'ESIC_EMP', type: 'pct_gross', value: 0.75, taxable: false },
  { name: 'Professional Tax', code: 'PT', type: 'fixed', value: 200, taxable: false },
];

function computeMonthlyAmounts(earnings, deductions, ctc) {
  const monthly = ctc / 12;
  let basicMonthly = 0;
  let grossMonthly = 0;

  const earnAmounts = earnings.map((e) => {
    let amount = 0;
    if (e.type === 'pct_ctc') {
      amount = (monthly * (Number(e.value) || 0)) / 100;
    } else if (e.type === 'pct_basic') {
      amount = (basicMonthly * (Number(e.value) || 0)) / 100;
    } else if (e.type === 'fixed') {
      amount = Number(e.value) || 0;
    } else if (e.type === 'special_balance') {
      amount = 0; // computed after
    }
    if (e.code === 'BASIC') basicMonthly = amount;
    return { ...e, amount };
  });

  // First pass for non-balance
  const nonBalance = earnAmounts.filter((e) => e.type !== 'special_balance');
  const nonBalanceTotal = nonBalance.reduce((s, e) => s + e.amount, 0);

  // Special balance fills remainder
  const finalEarnAmounts = earnAmounts.map((e) => {
    if (e.type === 'special_balance') {
      return { ...e, amount: Math.max(0, monthly - nonBalanceTotal) };
    }
    return e;
  });

  grossMonthly = finalEarnAmounts.reduce((s, e) => s + e.amount, 0);

  const dedAmounts = deductions.map((d) => {
    let amount = 0;
    if (d.type === 'pct_basic') {
      amount = (basicMonthly * (Number(d.value) || 0)) / 100;
    } else if (d.type === 'pct_gross') {
      amount = (grossMonthly * (Number(d.value) || 0)) / 100;
    } else if (d.type === 'fixed') {
      amount = Number(d.value) || 0;
    }
    return { ...d, amount };
  });

  const totalDeductions = dedAmounts.reduce((s, d) => s + d.amount, 0);
  const netPay = grossMonthly - totalDeductions;

  return { earnAmounts: finalEarnAmounts, dedAmounts, grossMonthly, totalDeductions, netPay, basicMonthly };
}

function ComponentRow({ field, index, register, remove, errors, prefix }) {
  return (
    <tr className="group">
      <td className="px-3 py-2">
        <input
          className={`form-input text-sm py-1.5 ${errors?.[index]?.name ? 'border-red-400' : ''}`}
          placeholder="Component Name"
          {...register(`${prefix}.${index}.name`, { required: true })}
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="form-input text-sm py-1.5 uppercase"
          placeholder="CODE"
          {...register(`${prefix}.${index}.code`)}
        />
      </td>
      <td className="px-3 py-2">
        <select
          className="form-select text-sm py-1.5"
          {...register(`${prefix}.${index}.type`)}
        >
          {COMPONENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          {prefix === 'earnings' && (
            <option value="special_balance">Balance (Auto)</option>
          )}
          {prefix === 'deductions' && (
            <option value="pct_gross">% of Gross</option>
          )}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          className="form-input text-sm py-1.5 w-24"
          placeholder="Value"
          step="0.01"
          {...register(`${prefix}.${index}.value`, { valueAsNumber: true })}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          {...register(`${prefix}.${index}.taxable`)}
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => remove(index)}
          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

export default function SalaryStructureForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'new';
  const [previewCtc, setPreviewCtc] = useState(600000);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      earnings: DEFAULT_EARNINGS,
      deductions: DEFAULT_DEDUCTIONS,
    },
  });

  const {
    fields: earningFields,
    append: appendEarning,
    remove: removeEarning,
  } = useFieldArray({ control, name: 'earnings' });

  const {
    fields: deductionFields,
    append: appendDeduction,
    remove: removeDeduction,
  } = useFieldArray({ control, name: 'deductions' });

  const { data: structureData, isLoading: fetchLoading } = useQuery({
    queryKey: ['salary-structure', id],
    queryFn: () => api.get(`/salary-structures/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!structureData) return;
    reset({
      name: structureData.name || '',
      description: structureData.description || '',
      earnings: structureData.earnings || DEFAULT_EARNINGS,
      deductions: structureData.deductions || DEFAULT_DEDUCTIONS,
    });
  }, [structureData, reset]);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.put(`/salary-structures/${id}`, payload)
        : api.post('/salary-structures', payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Salary structure updated' : 'Salary structure created');
      navigate('/salary-structures');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save structure');
    },
  });

  const watchedEarnings = watch('earnings') || [];
  const watchedDeductions = watch('deductions') || [];

  const preview = computeMonthlyAmounts(watchedEarnings, watchedDeductions, previewCtc);

  const onSubmit = useCallback(
    (data) => {
      saveMutation.mutate(data);
    },
    [saveMutation]
  );

  if (isEdit && fetchLoading) {
    return <LoadingSpinner className="py-24" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button className="btn-secondary py-1.5 px-3" onClick={() => navigate('/salary-structures')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Salary Structure' : 'New Salary Structure'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define components and their calculation method
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Structure Name *</label>
              <input
                className={`form-input ${errors.name ? 'border-red-400' : ''}`}
                placeholder="e.g., Standard Monthly, Senior Level"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="form-label">Description</label>
              <input
                className="form-input"
                placeholder="Optional description"
                {...register('description')}
              />
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Earnings</h2>
            <button
              type="button"
              className="btn-secondary py-1.5 px-3 text-xs"
              onClick={() =>
                appendEarning({ name: '', code: '', type: 'fixed', value: 0, taxable: true })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add Earning
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header text-left">Component Name</th>
                  <th className="table-header text-left">Code</th>
                  <th className="table-header text-left">Type</th>
                  <th className="table-header text-left">Value</th>
                  <th className="table-header text-center">Taxable</th>
                  <th className="table-header w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {earningFields.map((field, index) => (
                  <ComponentRow
                    key={field.id}
                    field={field}
                    index={index}
                    register={register}
                    remove={removeEarning}
                    errors={errors.earnings}
                    prefix="earnings"
                  />
                ))}
                {earningFields.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-gray-400">
                      No earnings components. Click &ldquo;Add Earning&rdquo; to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deductions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Deductions</h2>
            <button
              type="button"
              className="btn-secondary py-1.5 px-3 text-xs"
              onClick={() =>
                appendDeduction({ name: '', code: '', type: 'fixed', value: 0, taxable: false })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add Deduction
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header text-left">Component Name</th>
                  <th className="table-header text-left">Code</th>
                  <th className="table-header text-left">Type</th>
                  <th className="table-header text-left">Value</th>
                  <th className="table-header text-center">Taxable</th>
                  <th className="table-header w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deductionFields.map((field, index) => (
                  <ComponentRow
                    key={field.id}
                    field={field}
                    index={index}
                    register={register}
                    remove={removeDeduction}
                    errors={errors.deductions}
                    prefix="deductions"
                  />
                ))}
                {deductionFields.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-gray-400">
                      No deduction components.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview */}
        <div className="card bg-gray-50 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary-600" />
              <h2 className="text-base font-semibold text-gray-800">Live Preview</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Example CTC (₹/year)</label>
              <input
                type="number"
                className="form-input w-32 py-1.5 text-sm"
                value={previewCtc}
                onChange={(e) => setPreviewCtc(Number(e.target.value) || 0)}
                step={10000}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {/* Earnings preview */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Earnings (Monthly)
              </h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Component</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.earnAmounts.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{e.name || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">
                          {formatCurrency(Math.round(e.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-green-50">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-green-800">Gross Earnings</td>
                      <td className="px-3 py-2 text-right font-bold text-green-800">
                        {formatCurrency(Math.round(preview.grossMonthly))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Deductions preview */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Deductions (Monthly)
              </h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Component</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.dedAmounts.map((d, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{d.name || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">
                          {formatCurrency(Math.round(d.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-red-50">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-red-800">Total Deductions</td>
                      <td className="px-3 py-2 text-right font-bold text-red-800">
                        {formatCurrency(Math.round(preview.totalDeductions))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* Net Pay */}
              <div className="mt-3 bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-primary-700">Net Pay (Monthly)</span>
                <span className="text-lg font-bold text-primary-700">
                  {formatCurrency(Math.round(preview.netPay))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/salary-structures')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary px-6"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Update Structure' : 'Create Structure'}
          </button>
        </div>
      </form>
    </div>
  );
}
