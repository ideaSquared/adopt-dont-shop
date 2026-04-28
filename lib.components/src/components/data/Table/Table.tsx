import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  emptyState,
  loadingRowTd,
  sortIconBase,
  sortIconVariants,
  stripedRow,
  styledTable,
  tableCell,
  tableContainer,
  tableHead,
  tableHeaderCell,
  tableRow,
} from './Table.css';

export type SortDirection = 'asc' | 'desc' | null;

export type TableColumn<T = Record<string, unknown>> = {
  key: string;
  header: string;
  accessor?: string | ((row: T) => unknown);
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  headerRender?: () => React.ReactNode;
};

export type TableProps<T = Record<string, unknown>> = {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  sortable?: boolean;
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  responsive?: boolean;
  emptyMessage?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  onRowClick?: (row: T, index: number) => void;
  rowKey?: string | ((row: T, index: number) => string);
  className?: string;
  'data-testid'?: string;
  /**
   * Table size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Table variant
   */
  variant?: 'default' | 'minimal' | 'bordered';
  /**
   * Sticky header
   */
  stickyHeader?: boolean;
  /**
   * Maximum height for table container
   */
  maxHeight?: string;
};

const getSortIconContent = (direction: SortDirection): string => {
  if (direction === 'asc') {
    return '↑';
  }
  if (direction === 'desc') {
    return '↓';
  }
  return '↕';
};

const getValue = <T,>(row: T, accessor: string | ((row: T) => unknown)): unknown => {
  if (typeof accessor === 'function') {
    return accessor(row);
  }

  return accessor.split('.').reduce((obj: unknown, key: string) => {
    if (typeof obj === 'object' && obj !== null && key in obj) {
      // @ts-expect-error: index signature
      return obj[key];
    }
    return undefined;
  }, row);
};

export const Table = <T,>({
  columns,
  data,
  loading = false,
  sortable = false,
  striped = false,
  // bordered = false,
  hoverable = true,
  // compact = false,
  responsive = true,
  emptyMessage = 'No data available',
  sortBy,
  sortDirection,
  onSort,
  onRowClick,
  rowKey = 'id',
  className,
  'data-testid': dataTestId,
  size = 'md',
  variant = 'default',
  stickyHeader = false,
  maxHeight,
}: TableProps<T>) => {
  const [internalSort, setInternalSort] = useState<{
    column: string;
    direction: SortDirection;
  }>({
    column: sortBy || '',
    direction: sortDirection || null,
  });

  const effectiveSortBy = sortBy !== undefined ? sortBy : internalSort.column;
  const effectiveSortDirection =
    sortDirection !== undefined ? sortDirection : internalSort.direction;

  const sortedData = useMemo(() => {
    if (!effectiveSortBy || !effectiveSortDirection) {
      return data;
    }

    const column = columns.find(col => col.key === effectiveSortBy);
    if (!column) {
      return data;
    }

    const accessor = column.accessor || column.key;

    return [...data].sort((a, b) => {
      const aValue = getValue(a, accessor);
      const bValue = getValue(b, accessor);

      if (aValue === bValue) {
        return 0;
      }

      let comparison = 0;
      if (aValue === null || aValue === undefined) {
        comparison = 1;
      } else if (bValue === null || bValue === undefined) {
        comparison = -1;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue < bValue ? -1 : 1;
      }

      return effectiveSortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, columns, effectiveSortBy, effectiveSortDirection]);

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable && !sortable) {
      return;
    }

    const isCurrentColumn = column.key === effectiveSortBy;
    let newDirection: SortDirection = 'asc';

    if (isCurrentColumn) {
      if (effectiveSortDirection === 'asc') {
        newDirection = 'desc';
      } else if (effectiveSortDirection === 'desc') {
        newDirection = null;
      }
    }

    if (onSort) {
      onSort(column.key, newDirection);
    } else {
      setInternalSort({
        column: newDirection ? column.key : '',
        direction: newDirection,
      });
    }
  };

  const handleRowClick = (row: T, index: number) => {
    if (onRowClick) {
      onRowClick(row, index);
    }
  };

  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row, index);
    }
    const value = getValue(row, rowKey);
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return index.toString();
  };

  const containerStyle = maxHeight ? { maxHeight, overflowY: 'auto' as const } : undefined;

  if (loading) {
    return (
      <div className={clsx(tableContainer({ responsive }), className)} style={containerStyle}>
        {/* Visually hidden spinner for a11y */}
        <div
          role='status'
          aria-live='polite'
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
          }}
        >
          Loading…
        </div>
        <table className={styledTable({ size, variant })} data-testid={dataTestId}>
          <thead className={tableHead({ sticky: stickyHeader })}>
            <tr className={tableRow({ hoverable: false, clickable: false, striped: false })}>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={tableHeaderCell({ sortable: false, align: column.align ?? 'left' })}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                  }}
                >
                  {column.headerRender ? column.headerRender() : column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                {columns.map(column => (
                  <td key={column.key} className={loadingRowTd}>
                    <div style={{ height: '20px', width: '100%' }} />
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
      <div className={clsx(tableContainer({ responsive }), className)} style={containerStyle}>
        <div className={emptyState}>
          <svg
            width='48'
            height='48'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1'
            style={{ marginBottom: '16px', opacity: 0.5 }}
          >
            <rect x='3' y='3' width='18' height='18' rx='2' ry='2' />
            <path d='M9 9h6v6H9z' />
          </svg>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(tableContainer({ responsive }), className)} style={containerStyle}>
      <table className={styledTable({ size, variant })} data-testid={dataTestId}>
        <thead className={tableHead({ sticky: stickyHeader })}>
          <tr className={tableRow({ hoverable: false, clickable: false, striped: false })}>
            {columns.map(column => (
              <th
                key={column.key}
                className={tableHeaderCell({
                  sortable: !!(column.sortable || sortable),
                  align: column.align || 'left',
                })}
                style={{
                  width: column.width,
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                }}
                onClick={() => handleSort(column)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSort(column);
                  }
                }}
                tabIndex={column.sortable || sortable ? 0 : undefined}
                role={column.sortable || sortable ? 'button' : undefined}
                aria-sort={
                  column.key === effectiveSortBy
                    ? effectiveSortDirection === 'asc'
                      ? 'ascending'
                      : effectiveSortDirection === 'desc'
                        ? 'descending'
                        : 'none'
                    : 'none'
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      column.align === 'center'
                        ? 'center'
                        : column.align === 'right'
                          ? 'flex-end'
                          : 'flex-start',
                  }}
                >
                  {column.headerRender ? column.headerRender() : column.header}
                  {(column.sortable || sortable) && (
                    <span
                      className={clsx(
                        sortIconBase,
                        column.key === effectiveSortBy && effectiveSortDirection
                          ? sortIconVariants.active
                          : sortIconVariants.inactive
                      )}
                    >
                      {getSortIconContent(
                        column.key === effectiveSortBy ? effectiveSortDirection : null
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedData.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              className={clsx(
                tableRow({
                  hoverable: !!hoverable,
                  clickable: !!onRowClick,
                  striped: !!striped,
                }),
                striped && index % 2 === 1 && stripedRow
              )}
              onClick={() => handleRowClick(row, index)}
              onKeyDown={e => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleRowClick(row, index);
                }
              }}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
            >
              {columns.map(column => {
                const accessor = column.accessor || column.key;
                const value = getValue(row, accessor);
                let cellContent: React.ReactNode;
                if (column.render) {
                  cellContent = column.render(value, row, index);
                } else if (typeof value === 'object' && value !== null) {
                  cellContent = JSON.stringify(value);
                } else {
                  cellContent = value as React.ReactNode;
                }
                return (
                  <td key={column.key} className={tableCell({ align: column.align || 'left' })}>
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

Table.displayName = 'Table';
