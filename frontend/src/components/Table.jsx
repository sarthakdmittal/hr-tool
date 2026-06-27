import LoadingSpinner from './LoadingSpinner';

export default function Table({ columns, data, loading, emptyMessage = 'No data found', onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`table-header text-left first:rounded-tl-lg last:rounded-tr-lg ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12">
                <LoadingSpinner />
              </td>
            </tr>
          ) : data?.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-sm text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data?.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`table-cell ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
