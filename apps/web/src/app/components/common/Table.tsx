'use client';

import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
}

export function Table<T>({ columns, data, isLoading, onRowClick }: TableProps<T>) {
  return (
    <div className="w-full overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition-all duration-300">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              {columns.map((column, idx) => (
                <th 
                  key={idx} 
                  className={`px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-6">
                      <div className="h-4 bg-gray-100 rounded-lg w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 font-medium">
                  No data available.
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => onRowClick?.(item)}
                  className={`
                    group transition-colors hover:bg-brand-50/30
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((column, cIdx) => (
                    <td key={cIdx} className={`px-6 py-6 text-sm font-semibold text-gray-700 ${column.className || ''}`}>
                      {typeof column.accessor === 'function' 
                        ? column.accessor(item) 
                        : (item[column.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
