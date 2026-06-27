const variants = {
  green:   'bg-green-100 text-green-800',
  red:     'bg-red-100 text-red-800',
  yellow:  'bg-yellow-100 text-yellow-800',
  blue:    'bg-blue-100 text-blue-800',
  gray:    'bg-gray-100 text-gray-700',
  purple:  'bg-purple-100 text-purple-800',
  orange:  'bg-orange-100 text-orange-800',
  indigo:  'bg-indigo-100 text-indigo-800',
};

const statusMap = {
  active:     'green',
  inactive:   'gray',
  terminated: 'red',
  present:    'green',
  absent:     'red',
  half_day:   'yellow',
  wfh:        'blue',
  holiday:    'gray',
  leave:      'purple',
  lop:        'red',
  draft:      'gray',
  processed:  'blue',
  locked:     'green',
  pending:    'yellow',
  approved:   'green',
  rejected:   'red',
};

export default function Badge({ label, variant, status, className = '' }) {
  const resolvedVariant = variant || (status ? statusMap[status?.toLowerCase()] : null) || 'gray';
  const cls = variants[resolvedVariant] || variants.gray;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls} ${className}`}>
      {label || status}
    </span>
  );
}
