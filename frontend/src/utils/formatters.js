import { format, parseISO } from 'date-fns';

export const formatCurrency = (amount, compact = false) => {
  if (amount == null) return '—';
  const num = Number(amount);
  if (compact && num >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatDate = (date, fmt = 'dd/MM/yyyy') => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, fmt);
  } catch {
    return date;
  }
};

export const formatMonthYear = (date) => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'MMMM yyyy');
  } catch {
    return '';
  }
};

export const getMonthOptions = () => {
  return [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
};

export const getCurrentYear = () => new Date().getFullYear();
export const getCurrentMonth = () => new Date().getMonth() + 1;

export const getYearOptions = (range = 3) => {
  const current = getCurrentYear();
  const years = [];
  for (let y = current + 1; y >= current - range; y--) {
    years.push({ value: y, label: String(y) });
  }
  return years;
};
