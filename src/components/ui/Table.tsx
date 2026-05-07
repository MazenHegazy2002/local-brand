'use client';

import { ReactNode, useState, useCallback } from 'react';

export interface TableColumn<T = unknown> {
  header: string;
  accessor: keyof T | string;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
}

interface TableProps<T = unknown> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (accessor: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  className?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyMessage = 'No data available',
  onSort,
  sortBy,
  sortOrder,
  className = '',
}: TableProps<T>) {
  const handleSort = useCallback((accessor: string) => {
    onSort?.(accessor);
  }, [onSort]);

  const getCellValue = (row: T, column: TableColumn<T>): ReactNode => {
    if (column.cell) {
      return column.cell(row);
    }
    const value = row[column.accessor as keyof T];
    return value as ReactNode ?? '-';
  };

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className={`w-full ${className}`}>
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                {columns.map((_, j) => (
                  <td key={j} className="px-4 py-4">
                    <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className={`w-full ${className}`}>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`
                  px-4 py-3 text-left text-sm font-semibold text-gray-600
                  ${col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                `}
                onClick={() => col.sortable && handleSort(String(col.accessor))}
              >
                <div className="flex items-center gap-2">
                  {col.header}
                  {col.sortable && sortBy === col.accessor && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={sortOrder === 'desc' ? 'rotate-180' : ''}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className="px-4 py-3 text-sm text-gray-700">
                  {getCellValue(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;