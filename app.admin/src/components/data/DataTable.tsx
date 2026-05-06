import React, { useState } from 'react';
import * as styles from './DataTable.css';
import {
  FiChevronUp,
  FiChevronDown,
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { SkeletonTableRow } from '../ui/Skeleton';

export interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  // Selection
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getRowId?: (row: T) => string;
}

const SKELETON_ROW_COUNT = 5;

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  getRowId = (_row: T) => String(Math.random()),
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(
    null
  );

  const handleSort = (columnId: string) => {
    const newDirection =
      (sortColumn || localSort?.column) === columnId &&
      (sortDirection || localSort?.direction) === 'asc'
        ? 'desc'
        : 'asc';

    if (onSort) {
      onSort(columnId, newDirection);
    } else {
      setLocalSort({ column: columnId, direction: newDirection });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) {
      return;
    }

    if (checked) {
      const allIds = new Set(data.map(row => getRowId(row)));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (!onSelectionChange) {
      return;
    }

    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    onSelectionChange(newSelection);
  };

  const getCellValue = (row: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor] as React.ReactNode;
  };

  const allSelected = data.length > 0 && data.every(row => selectedRows.has(getRowId(row)));

  const visiblePageCount = Math.min(5, totalPages);
  const startPage = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - visiblePageCount + 1)
  );

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {selectable && (
                <th
                  className={styles.th({ align: 'center', sortable: false })}
                  style={{ width: '48px' }}
                >
                  <input
                    className={styles.checkbox}
                    type='checkbox'
                    checked={allSelected}
                    onChange={e => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={column.id}
                  className={styles.th({
                    align: column.align ?? 'left',
                    sortable: column.sortable ?? false,
                  })}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className={styles.thContent}>
                    {column.header}
                    {column.sortable && (
                      <span className={styles.sortIcon}>
                        {(sortColumn || localSort?.column) === column.id ? (
                          (sortDirection || localSort?.direction) === 'asc' ? (
                            <FiChevronUp />
                          ) : (
                            <FiChevronDown />
                          )
                        ) : (
                          <FiChevronDown style={{ opacity: 0.3 }} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {loading ? (
              Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
                <SkeletonTableRow key={i} columnCount={columns.length} hasCheckbox={selectable} />
              ))
            ) : data.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>{emptyMessage}</td>
              </tr>
            ) : (
              data.map(row => {
                const rowId = getRowId(row);
                return (
                  <tr
                    key={rowId}
                    className={styles.tr({ clickable: !!onRowClick })}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {selectable && (
                      <td
                        className={styles.td({ align: 'center' })}
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          className={styles.checkbox}
                          type='checkbox'
                          checked={selectedRows.has(rowId)}
                          onChange={e => handleSelectRow(rowId, e.target.checked)}
                        />
                      </td>
                    )}
                    {columns.map(column => (
                      <td key={column.id} className={styles.td({ align: column.align ?? 'left' })}>
                        {getCellValue(row, column)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className={styles.paginationContainer}>
          <div className={styles.paginationInfo}>
            Page {currentPage} of {totalPages}
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.pageButton({ active: false })}
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              aria-label='First page'
            >
              <FiChevronsLeft />
            </button>
            <button
              className={styles.pageButton({ active: false })}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label='Previous page'
            >
              <FiChevronLeft />
            </button>

            {Array.from({ length: visiblePageCount }, (_, i) => {
              const pageNum = startPage + i;
              return (
                <button
                  key={pageNum}
                  className={styles.pageButton({ active: currentPage === pageNum })}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              className={styles.pageButton({ active: false })}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label='Next page'
            >
              <FiChevronRight />
            </button>
            <button
              className={styles.pageButton({ active: false })}
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              aria-label='Last page'
            >
              <FiChevronsRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
