import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isWeekend,
} from 'date-fns';
import { Save, Users, Calendar, Check, Trash2 } from 'lucide-react';
import api from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import {
  getMonthOptions,
  getYearOptions,
  getCurrentMonth,
  getCurrentYear,
} from '../../utils/formatters';

// Each status and its paid-day contribution
const STATUS_OPTIONS = [
  { value: 'P',    label: 'Present',        color: 'bg-green-500',   pillCls: 'bg-green-100 text-green-800 border border-green-300',   pay: 1.0 },
  { value: 'A',    label: 'Absent',         color: 'bg-red-500',     pillCls: 'bg-red-100 text-red-800 border border-red-300',         pay: 0   },
  { value: 'W',    label: 'Weekly Off',     color: 'bg-indigo-500',  pillCls: 'bg-indigo-100 text-indigo-800 border border-indigo-300', pay: 1.0 },
  { value: 'P/2',  label: 'Half Day',       color: 'bg-yellow-400',  pillCls: 'bg-yellow-100 text-yellow-800 border border-yellow-300', pay: 0.5 },
  { value: 'H',    label: 'Holiday',        color: 'bg-gray-400',    pillCls: 'bg-gray-100 text-gray-700 border border-gray-300',       pay: 1.0 },
  { value: 'L',    label: 'Leave',          color: 'bg-blue-500',    pillCls: 'bg-blue-100 text-blue-800 border border-blue-300',       pay: 1.0 },
  { value: 'LOP',  label: 'Leave (Unpaid)', color: 'bg-pink-500',    pillCls: 'bg-pink-100 text-pink-800 border border-pink-300',       pay: 0   },
  { value: 'OT',   label: 'Overtime',       color: 'bg-orange-500',  pillCls: 'bg-orange-100 text-orange-800 border border-orange-300', pay: 1.0 },
  { value: 'OT/2', label: 'Overtime ½ Day', color: 'bg-orange-300',  pillCls: 'bg-orange-50 text-orange-700 border border-orange-200',  pay: 0.5 },
];

const OPT_MAP = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o]));

// Statuses that cannot be combined with others
const EXCLUSIVE = new Set(['A', 'L', 'LOP']);
// OT codes can only appear alongside another base code
const OT_CODES = new Set(['OT', 'OT/2']);

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// --- helpers ---

/** Parse "P,OT" → ['P','OT']; handle plain string or array */
function parseStatuses(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/** ['P','OT'] → "P,OT" */
function serializeStatuses(arr) {
  return arr.join(',');
}

function computePaidDays(statuses) {
  return statuses.reduce((sum, s) => sum + (OPT_MAP[s]?.pay ?? 0), 0);
}

function getCalendarDays(year, month) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  const startDow = getDay(start);
  const padStart = startDow === 0 ? 6 : startDow - 1;
  const cells = [];
  for (let i = 0; i < padStart; i++) cells.push(null);
  days.forEach((d) => cells.push(d));
  const rem = cells.length % 7;
  if (rem !== 0) for (let i = 0; i < 7 - rem; i++) cells.push(null);
  return cells;
}

function computeSummary(attendance, year, month) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  const counts = { P: 0, A: 0, W: 0, 'P/2': 0, H: 0, OT: 0, 'OT/2': 0 };
  let paidDays = 0;

  days.forEach((d) => {
    const key = format(d, 'yyyy-MM-dd');
    const statuses = parseStatuses(attendance[key]);
    statuses.forEach(s => { if (counts[s] !== undefined) counts[s]++; });
    paidDays += computePaidDays(statuses);
  });

  return { ...counts, paidDays };
}

// --- StatusPills: renders multiple pills for a day ---
function StatusPills({ statuses }) {
  if (!statuses || statuses.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-0.5">
      {statuses.map(s => {
        const opt = OPT_MAP[s];
        return (
          <span key={s} className={`inline-block px-1 py-0.5 rounded text-xs font-bold leading-none ${opt?.pillCls || 'bg-gray-100 text-gray-600'}`}>
            {s}
          </span>
        );
      })}
    </div>
  );
}

// --- Multi-select StatusPicker ---
function StatusPicker({ currentStatuses, onChange, onClose }) {
  const ref = useRef(null);
  const [selected, setSelected] = useState(new Set(currentStatuses));

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onChange([...selected]);
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, onChange, selected]);

  const toggle = (value) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        // If selecting an exclusive code (A), clear everything else
        if (EXCLUSIVE.has(value)) {
          next.clear();
        } else {
          // If something exclusive was selected, remove it
          EXCLUSIVE.forEach(ex => next.delete(ex));
          // Can only have one OT-type code at a time
          if (OT_CODES.has(value)) OT_CODES.forEach(ot => next.delete(ot));
          // Can only have one base code (P, P/2, W, H, A) at a time
          if (!OT_CODES.has(value)) {
            STATUS_OPTIONS.filter(o => !OT_CODES.has(o.value)).forEach(o => next.delete(o.value));
          }
        }
        next.add(value);
      }
      return next;
    });
  };

  const handleDone = () => {
    onChange([...selected]);
    onClose();
  };

  const handleClear = () => {
    setSelected(new Set());
    onChange([]);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute z-30 top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 p-2 min-w-[170px]"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs text-gray-400 px-2 pb-1 font-medium">Select statuses</p>
      {STATUS_OPTIONS.map((opt) => {
        const isSelected = selected.has(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              isSelected ? 'bg-primary-50 font-semibold' : 'hover:bg-gray-50'
            }`}
          >
            <span className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
              {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
            <span className="flex-1 text-left">{opt.value}</span>
            <span className="text-xs text-gray-400">{opt.label}</span>
          </button>
        );
      })}
      <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
        <button onClick={handleClear} className="flex-1 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
          Clear
        </button>
        <button onClick={handleDone} className="flex-1 py-1 text-xs text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors font-medium">
          Done
        </button>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function AttendanceView() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedEmployee, setSelectedEmployee] = useState('');
  // attendance: { 'yyyy-MM-dd': ['P', 'OT'] }  (arrays internally)
  const [attendance, setAttendance] = useState({});
  const [modified, setModified] = useState(new Set());
  const [openCellDate, setOpenCellDate] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [bulkFrom, setBulkFrom] = useState('');
  const [bulkTo, setBulkTo] = useState('');
  const [bulkStatuses, setBulkStatuses] = useState(new Set(['P']));

  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => api.get('/employees?status=active').then((r) => r.data),
  });

  const { data: holidayData = [], isLoading: holidaysLoading } = useQuery({
    queryKey: ['holidays', selectedMonth, selectedYear],
    queryFn: () =>
      api.get('/holidays', { params: { month: selectedMonth, year: selectedYear } }).then((r) => r.data),
  });

  const holidayMap = {};
  holidayData.forEach((h) => { holidayMap[h.date] = h.name; });

  const { data: attData, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', selectedEmployee, selectedMonth, selectedYear],
    queryFn: async () => {
      const r = await api.get('/attendance', {
        params: { employee_id: selectedEmployee, month: selectedMonth, year: selectedYear },
      });
      return r.data;
    },
    enabled: !!selectedEmployee,
  });

  useEffect(() => {
    if (!attData) return;
    const map = {};
    // Parse stored comma-separated statuses into arrays
    attData.forEach((rec) => { map[rec.date] = parseStatuses(rec.status); });
    // Auto-set Sundays → ['W'] if not already marked
    const start = startOfMonth(new Date(selectedYear, selectedMonth - 1, 1));
    const end = endOfMonth(start);
    eachDayOfInterval({ start, end }).forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      if (!map[key] && d.getDay() === 0) map[key] = ['W'];
    });
    Object.keys(holidayMap).forEach((date) => {
      if (!map[date]) map[date] = ['H'];
    });
    setAttendance(map);
    setModified(new Set());
  }, [attData]);

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/attendance/clear', {
      data: { employee_id: selectedEmployee, month: selectedMonth, year: selectedYear }
    }),
    onSuccess: () => {
      toast.success('Attendance cleared');
      setClearModalOpen(false);
      setAttendance({});
      setModified(new Set());
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedEmployee, selectedMonth, selectedYear] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to clear attendance');
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (payload) => api.post('/attendance/bulk', payload),
    onSuccess: () => {
      toast.success('Attendance saved successfully');
      setModified(new Set());
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedEmployee, selectedMonth, selectedYear] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to save attendance');
    },
  });

  const handleEmployeeChange = (e) => {
    setSelectedEmployee(e.target.value);
    setAttendance({});
    setModified(new Set());
  };

  const handleCellClick = useCallback((dateStr) => {
    if (!selectedEmployee) { toast.error('Please select an employee first'); return; }
    setOpenCellDate((prev) => (prev === dateStr ? null : dateStr));
  }, [selectedEmployee]);

  const handleStatusChange = useCallback((dateStr, statuses) => {
    setAttendance((prev) => {
      const next = { ...prev };
      if (statuses.length === 0) delete next[dateStr];
      else next[dateStr] = statuses;
      return next;
    });
    setModified((prev) => { const next = new Set(prev); next.add(dateStr); return next; });
  }, []);

  const handleSave = () => {
    if (!selectedEmployee) { toast.error('Please select an employee'); return; }
    if (modified.size === 0) { toast('No changes to save', { icon: 'ℹ️' }); return; }

    const records = Array.from(modified)
      .map((date) => ({
        date,
        // Serialize array → comma-separated string for API
        status: attendance[date]?.length ? serializeStatuses(attendance[date]) : null,
      }))
      .filter((r) => r.status !== null);

    bulkMutation.mutate({ employee_id: selectedEmployee, records });
  };

  const toggleBulkStatus = (val) => {
    setBulkStatuses(prev => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  };

  const handleBulkMark = () => {
    if (!selectedEmployee) { toast.error('Please select an employee'); return; }
    if (!bulkFrom || !bulkTo) { toast.error('Please select a date range'); return; }
    if (bulkStatuses.size === 0) { toast.error('Please select at least one status'); return; }
    const from = new Date(bulkFrom);
    const to = new Date(bulkTo);
    if (from > to) { toast.error('From date must be before To date'); return; }
    const days = eachDayOfInterval({ start: from, end: to });
    const newAttendance = { ...attendance };
    const newModified = new Set(modified);
    days.forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      newAttendance[key] = [...bulkStatuses];
      newModified.add(key);
    });
    setAttendance(newAttendance);
    setModified(newModified);
    setBulkModalOpen(false);
    toast.success(`Marked ${days.length} days as ${[...bulkStatuses].join('+')} `);
  };

  const calendarCells = getCalendarDays(selectedYear, selectedMonth);
  const summary = computeSummary(attendance, selectedYear, selectedMonth);
  const isLoading = attLoading || holidaysLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Click any day to mark single or multiple statuses (e.g. P + OT)</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="form-label">Month</label>
            <select className="form-select w-36" value={selectedMonth}
              onChange={(e) => { setSelectedMonth(Number(e.target.value)); setAttendance({}); setModified(new Set()); }}>
              {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Year</label>
            <select className="form-select w-28" value={selectedYear}
              onChange={(e) => { setSelectedYear(Number(e.target.value)); setAttendance({}); setModified(new Set()); }}>
              {yearOptions.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="form-label">Employee</label>
            <select className="form-select" value={selectedEmployee} onChange={handleEmployeeChange}>
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.emp_id})</option>
              ))}
            </select>
          </div>
          <button className="btn-secondary" onClick={() => setBulkModalOpen(true)}>
            <Calendar className="h-4 w-4" /> Bulk Mark
          </button>
          {selectedEmployee && (
            <button className="btn-danger" onClick={() => setClearModalOpen(true)}>
              <Trash2 className="h-4 w-4" /> Clear Month
            </button>
          )}
        </div>
      </div>

      {/* Calendar + Summary */}
      <div className="flex gap-6">
        <div className="flex-1 card min-w-0">
          {isLoading && selectedEmployee ? (
            <LoadingSpinner className="py-20" />
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_HEADERS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="h-16 rounded-lg" />;
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const statuses = parseStatuses(attendance[dateStr]);
                  const isHoliday = !!holidayMap[dateStr];
                  const isOpen = openCellDate === dateStr;
                  const isModified = modified.has(dateStr);
                  const isWeekendDay = isWeekend(day);

                  return (
                    <div
                      key={dateStr}
                      className={`relative rounded-lg border cursor-pointer transition-all min-h-[4rem]
                        ${isOpen ? 'border-primary-400 ring-2 ring-primary-200 z-20' : 'border-gray-100 hover:border-gray-300'}
                        ${isWeekendDay && statuses.length === 0 ? 'bg-gray-50' : 'bg-white'}
                        ${isModified ? 'ring-1 ring-yellow-300' : ''}
                      `}
                      onClick={() => handleCellClick(dateStr)}
                    >
                      <div className="p-1.5 flex flex-col gap-0.5 h-full">
                        <span className={`text-xs font-semibold ${isWeekendDay ? 'text-gray-400' : 'text-gray-700'}`}>
                          {format(day, 'd')}
                        </span>
                        {statuses.length > 0
                          ? <StatusPills statuses={statuses} />
                          : isHoliday && (
                            <span className="text-xs text-gray-400 truncate" title={holidayMap[dateStr]}>
                              {holidayMap[dateStr].slice(0, 6)}
                            </span>
                          )
                        }
                      </div>
                      {isOpen && (
                        <StatusPicker
                          currentStatuses={statuses}
                          onChange={(s) => { handleStatusChange(dateStr, s); setOpenCellDate(null); }}
                          onClose={() => setOpenCellDate(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Summary Panel */}
        <div className="w-56 shrink-0">
          <div className="card sticky top-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" /> Summary
            </h3>
            <div className="space-y-2">
              {[
                { label: 'P — Present',        key: 'P',     color: 'text-green-700' },
                { label: 'A — Absent',         key: 'A',     color: 'text-red-600'   },
                { label: 'W — Weekly Off',     key: 'W',     color: 'text-indigo-600'},
                { label: 'P/2 — Half Day',     key: 'P/2',   color: 'text-yellow-700'},
                { label: 'H — Holiday',        key: 'H',     color: 'text-gray-600'  },
                { label: 'OT — Overtime',      key: 'OT',    color: 'text-orange-600'},
                { label: 'OT/2 — OT Half Day', key: 'OT/2',  color: 'text-orange-500'},
              ].map(({ label, key, color }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className={`font-semibold text-sm ${color}`}>{summary[key]}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700 text-sm">Paid Days</span>
                  <span className="font-bold text-gray-900">{summary.paidDays.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Absent (LOP)</span>
                  <span className="font-semibold text-red-600 text-sm">{summary['A']}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend + Save */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <span key={opt.value} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${opt.pillCls}`}>
              <span className={`w-2 h-2 rounded-full ${opt.color}`} />
              {opt.value} – {opt.label} ({opt.pay > 0 ? `+${opt.pay}d` : 'LOP'})
            </span>
          ))}
        </div>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={bulkMutation.isPending || modified.size === 0}
        >
          {bulkMutation.isPending
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <Save className="h-4 w-4" />
          }
          Save Attendance {modified.size > 0 && `(${modified.size})`}
        </button>
      </div>

      {/* Clear Month Modal */}
      <Modal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Clear Attendance"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setClearModalOpen(false)}>Cancel</button>
            <button
              className="btn-danger"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Clear
            </button>
          </>
        }
      >
        <p className="text-gray-700">
          Clear all attendance records for the selected employee for{' '}
          <span className="font-semibold">
            {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
          </span>?
        </p>
        <p className="text-sm text-gray-500 mt-1">This will permanently delete all records for this month. This cannot be undone.</p>
      </Modal>

      {/* Bulk Mark Modal */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Mark Attendance"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setBulkModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleBulkMark}>Apply</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)}
              min={format(startOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd')}
              max={format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd')} />
          </div>
          <div>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)}
              min={format(startOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd')}
              max={format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd')} />
          </div>
          <div>
            <label className="form-label">Status (select one or more)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {STATUS_OPTIONS.map((opt) => {
                const on = bulkStatuses.has(opt.value);
                return (
                  <button key={opt.value} type="button" onClick={() => toggleBulkStatus(opt.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      on ? opt.pillCls + ' ring-2 ring-offset-1 ring-primary-400' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}>
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    {opt.value}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
