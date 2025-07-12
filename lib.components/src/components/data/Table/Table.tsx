import React, { useMemo, useState } from 'react';
import styled, { css, keyframes, type DefaultTheme } from 'styled-components';

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

// Loading animation
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const getSizeStyles = (size: 'sm' | 'md' | 'lg', theme: DefaultTheme) => {
  const sizes = {
    sm: css`
      font-size: ${theme.typography.size.sm};

      th,
      td {
        padding: ${theme.spacing[2]} ${theme.spacing[3]};
      }
    `,
    md: css`
      font-size: ${theme.typography.size.base};

      th,
      td {
        padding: ${theme.spacing[3]} ${theme.spacing[4]};
      }
    `,
    lg: css`
      font-size: ${theme.typography.size.lg};

      th,
      td {
        padding: ${theme.spacing[4]} ${theme.spacing[5]};
      }
    `,
  };
  return sizes[size];
};

const getVariantStyles = (variant: 'default' | 'minimal' | 'bordered', theme: DefaultTheme) => {
  const variants = {
    default: css`
      border: 1px solid ${theme.border.color.primary};
      border-radius: ${theme.border.radius.lg};
      overflow: hidden;
    `,
    minimal: css`
      border: none;

      thead th {
        border-bottom: 2px solid ${theme.border.color.primary};
      }
    `,
    bordered: css`
      border: 1px solid ${theme.border.color.primary};
      border-radius: ${theme.border.radius.lg};
      overflow: hidden;

      th,
      td {
        border-right: 1px solid ${theme.border.color.primary};

        &:last-child {
          border-right: none;
        }
      }

      tbody tr {
        border-bottom: 1px solid ${theme.border.color.primary};

        &:last-child {
          border-bottom: none;
        }
      }
    `,
  };
  return variants[variant];
};

const TableContainer = styled.div<{
  $responsive: boolean;
  $maxHeight?: string;
}>`
  position: relative;
  background: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.border.radius.lg};

  ${({ $responsive }) =>
    $responsive &&
    css`
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    `}

  ${({ $maxHeight }) =>
    $maxHeight &&
    css`
      max-height: ${$maxHeight};
      overflow-y: auto;
    `}

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    height: 6px;
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.border.color.tertiary};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.border.color.quaternary};
  }
`;

const StyledTable = styled.table<{
  $size: 'sm' | 'md' | 'lg';
  $variant: 'default' | 'minimal' | 'bordered';
  $striped: boolean;
  $hoverable: boolean;
}>`
  width: 100%;
  border-collapse: collapse;
  font-family: ${({ theme }) => theme.typography.family.sans};
  background: ${({ theme }) => theme.background.secondary};

  ${({ $size, theme }) => getSizeStyles($size, theme)}
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
`;

const TableHead = styled.thead<{ $sticky: boolean }>`
  ${({ $sticky, theme }) =>
    $sticky &&
    css`
      position: sticky;
      top: 0;
      z-index: ${theme.zIndex.sticky};
      background: ${theme.background.secondary};
    `}
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{
  $striped: boolean;
  $hoverable: boolean;
  $clickable: boolean;
  $index: number;
}>`
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $striped, $index, theme }) =>
    $striped &&
    $index % 2 === 1 &&
    css`
      background: ${theme.colors.neutral[100] || theme.background.tertiary};
    `}

  ${({ $hoverable, theme }) =>
    $hoverable &&
    css`
      &:hover {
        background: ${theme.background.tertiary};
      }
    `}

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
    `}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const TableHeaderCell = styled.th<{
  $sortable: boolean;
  $align: 'left' | 'center' | 'right';
  $width?: string;
  $minWidth?: string;
  $maxWidth?: string;
}>`
  text-align: ${({ $align }) => $align};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.text.primary};
  background: ${({ theme }) => theme.background.secondary};
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  position: relative;
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.primary};
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $width }) =>
    $width &&
    css`
      width: ${$width};
    `}

  ${({ $minWidth }) =>
    $minWidth &&
    css`
      min-width: ${$minWidth};
    `}

  ${({ $maxWidth }) =>
    $maxWidth &&
    css`
      max-width: ${$maxWidth};
    `}

  ${({ $sortable, theme }) =>
    $sortable &&
    css`
      &:hover {
        background: ${theme.background.tertiary};
      }

      &:focus-visible {
        outline: none;
        background: ${theme.background.tertiary};
        box-shadow: inset 0 0 0 2px ${theme.colors.primary[500]};
      }
    `}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const SortIcon = styled.span<{ $direction: SortDirection }>`
  margin-left: ${({ theme }) => theme.spacing[1.5]};
  opacity: ${({ $direction }) => ($direction ? 1 : 0.3)};
  transition: opacity ${({ theme }) => theme.transitions.fast};
  font-size: ${({ theme }) => theme.typography.size.sm};

  &::after {
    content: ${({ $direction }) =>
      $direction === 'asc' ? '"↑"' : $direction === 'desc' ? '"↓"' : '"↕"'};
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const TableCell = styled.td<{
  $align: 'left' | 'center' | 'right';
}>`
  text-align: ${({ $align }) => $align};
  color: ${({ theme }) => theme.text.secondary};
  vertical-align: top;
  word-wrap: break-word;
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]} ${({ theme }) => theme.spacing[6]};
  color: ${({ theme }) => theme.text.tertiary};
  text-align: center;
`;

const EmptyIcon = () => (
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
);

const LoadingRow = styled.tr`
  td {
    padding: ${({ theme }) => theme.spacing[4]};
    background: ${({ theme }) => theme.background.tertiary};
    animation: ${pulse} 1.5s ease-in-out infinite;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    td {
      animation: none;
      opacity: 0.7;
    }
  }
`;

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
    if (!column) return data;

    const accessor = column.accessor || column.key;

    return [...data].sort((a, b) => {
      const aValue = getValue(a, accessor);
      const bValue = getValue(b, accessor);

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (aValue === null || aValue === undefined) comparison = 1;
      else if (bValue === null || bValue === undefined) comparison = -1;
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue < bValue ? -1 : 1;
      }

      return effectiveSortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, columns, effectiveSortBy, effectiveSortDirection]);

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable && !sortable) return;

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
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    return index.toString();
  };

  if (loading) {
    return (
      <TableContainer $responsive={responsive} $maxHeight={maxHeight} className={className}>
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
        <StyledTable
          $size={size}
          $variant={variant}
          $striped={striped}
          $hoverable={hoverable}
          data-testid={dataTestId}
        >
          <TableHead $sticky={stickyHeader}>
            <TableRow $striped={false} $hoverable={false} $clickable={false} $index={0}>
              {columns.map(column => (
                <TableHeaderCell
                  key={column.key}
                  $sortable={false}
                  $align={column.align || 'left'}
                  $width={column.width}
                  $minWidth={column.minWidth}
                  $maxWidth={column.maxWidth}
                >
                  {column.headerRender ? column.headerRender() : column.header}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <LoadingRow key={index}>
                {columns.map(column => (
                  <TableCell key={column.key} $align={column.align || 'left'}>
                    <div style={{ height: '20px', width: '100%' }} />
                  </TableCell>
                ))}
              </LoadingRow>
            ))}
          </TableBody>
        </StyledTable>
      </TableContainer>
    );
  }

  if (data.length === 0) {
    return (
      <TableContainer $responsive={responsive} $maxHeight={maxHeight} className={className}>
        <EmptyState>
          <EmptyIcon />
          <p>{emptyMessage}</p>
        </EmptyState>
      </TableContainer>
    );
  }

  return (
    <TableContainer $responsive={responsive} $maxHeight={maxHeight} className={className}>
      <StyledTable
        $size={size}
        $variant={variant}
        $striped={striped}
        $hoverable={hoverable}
        data-testid={dataTestId}
      >
        <TableHead $sticky={stickyHeader}>
          <TableRow $striped={false} $hoverable={false} $clickable={false} $index={0}>
            {columns.map(column => (
              <TableHeaderCell
                key={column.key}
                $sortable={column.sortable || sortable}
                $align={column.align || 'left'}
                $width={column.width}
                $minWidth={column.minWidth}
                $maxWidth={column.maxWidth}
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
                    <SortIcon
                      $direction={column.key === effectiveSortBy ? effectiveSortDirection : null}
                    />
                  )}
                </div>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow
              key={getRowKey(row, index)}
              $striped={striped}
              $hoverable={hoverable}
              $clickable={!!onRowClick}
              $index={index}
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
                  <TableCell key={column.key} $align={column.align || 'left'}>
                    {cellContent}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </StyledTable>
    </TableContainer>
  );
};

Table.displayName = 'Table';
