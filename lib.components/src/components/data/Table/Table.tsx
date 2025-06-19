import React, { useMemo, useState } from 'react';

import styled, { css } from 'styled-components';

import { Spinner } from '../../ui/Spinner';

export type SortDirection = 'asc' | 'desc' | null;

export type TableColumn<T = any> = {
  key: string;

  header: string;

  accessor?: string | ((row: T) => any);

  sortable?: boolean;

  width?: string;

  minWidth?: string;

  maxWidth?: string;

  align?: 'left' | 'center' | 'right';

  render?: (value: any, row: T, index: number) => React.ReactNode;

  headerRender?: () => React.ReactNode;
};

export type TableProps<T = any> = {
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
};

const TableContainer = styled.div<{ $responsive: boolean }>`
  ${({ $responsive }) =>
    $responsive &&
    css`
      overflow-x: auto;

      -webkit-overflow-scrolling: touch;
    `}
`;

const StyledTable = styled.table<{
  $striped: boolean;

  $bordered: boolean;

  $hoverable: boolean;

  $compact: boolean;
}>`
  width: 100%;

  border-collapse: collapse;

  font-size: ${({ theme }) => theme.typography.size.sm};

  ${({ $bordered, theme }) =>
    $bordered &&
    css`
      border: 1px solid ${theme.colors.neutral[200]};
    `}
`;

const TableHead = styled.thead`
  background-color: ${({ theme }) => theme.colors.neutral[50]};
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{
  $striped: boolean;

  $hoverable: boolean;

  $clickable: boolean;

  $index: number;
}>`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[200]};

  transition: background-color ${({ theme }) => theme.transitions.fast};

  ${({ $striped, $index, theme }) =>
    $striped &&
    $index % 2 === 1 &&
    css`
      background-color: ${theme.colors.neutral[25]};
    `}

  ${({ $hoverable, theme }) =>
    $hoverable &&
    css`
      &:hover {
        background-color: ${theme.colors.neutral[50]};
      }
    `}



  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
    `}



  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderCell = styled.th<{
  $sortable: boolean;

  $align: 'left' | 'center' | 'right';

  $compact: boolean;

  $width?: string;

  $minWidth?: string;

  $maxWidth?: string;
}>`
  padding: ${({ theme, $compact }) =>
    $compact ? `${theme.spacing.sm} ${theme.spacing.xs}` : theme.spacing.md};

  text-align: ${({ $align }) => $align};

  font-weight: ${({ theme }) => theme.typography.weight.semibold};

  color: ${({ theme }) => theme.colors.neutral[700]};

  background-color: ${({ theme }) => theme.colors.neutral[50]};

  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};

  user-select: none;

  position: relative;

  white-space: nowrap;

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
        background-color: ${theme.colors.neutral[100]};
      }
    `}
`;

const SortIcon = styled.span<{ $direction: SortDirection }>`
  margin-left: ${({ theme }) => theme.spacing.xs};

  opacity: ${({ $direction }) => ($direction ? 1 : 0.3)};

  transition: opacity ${({ theme }) => theme.transitions.fast};

  &::after {
    content: ${({ $direction }) =>
      $direction === 'asc' ? '"↑"' : $direction === 'desc' ? '"↓"' : '"↕"'};
  }
`;

const TableCell = styled.td<{
  $align: 'left' | 'center' | 'right';

  $compact: boolean;
}>`
  padding: ${({ theme, $compact }) =>
    $compact ? `${theme.spacing.sm} ${theme.spacing.xs}` : theme.spacing.md};

  text-align: ${({ $align }) => $align};

  color: ${({ theme }) => theme.colors.neutral[700]};

  vertical-align: top;

  word-wrap: break-word;
`;

const EmptyState = styled.div`
  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  padding: ${({ theme }) => theme.spacing.xl};

  color: ${({ theme }) => theme.colors.neutral[500]};

  text-align: center;
`;

const LoadingContainer = styled.div`
  display: flex;

  align-items: center;

  justify-content: center;

  padding: ${({ theme }) => theme.spacing.xl};
`;

const getValue = <T,>(row: T, accessor: string | ((row: T) => any)): any => {
  if (typeof accessor === 'function') {
    return accessor(row);
  }

  return accessor.split('.').reduce((obj: any, key: string) => {
    return obj?.[key];
  }, row);
};

export const Table = <T,>({
  columns,

  data,

  loading = false,

  sortable = false,

  striped = false,

  bordered = false,

  hoverable = true,

  compact = false,

  responsive = true,

  emptyMessage = 'No data available',

  sortBy,

  sortDirection,

  onSort,

  onRowClick,

  rowKey = 'id',

  className,

  'data-testid': dataTestId,
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

      if (aValue == null) comparison = 1;
      else if (bValue == null) comparison = -1;
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

    return getValue(row, rowKey) || index.toString();
  };

  if (loading) {
    return (
      <TableContainer $responsive={responsive}>
        <LoadingContainer>
          <Spinner size='md' />
        </LoadingContainer>
      </TableContainer>
    );
  }

  if (data.length === 0) {
    return (
      <TableContainer $responsive={responsive}>
        <EmptyState>
          <p>{emptyMessage}</p>
        </EmptyState>
      </TableContainer>
    );
  }

  return (
    <TableContainer $responsive={responsive} className={className}>
      <StyledTable
        $striped={striped}
        $bordered={bordered}
        $hoverable={hoverable}
        $compact={compact}
        data-testid={dataTestId}
      >
        <TableHead>
          <TableRow $striped={false} $hoverable={false} $clickable={false} $index={0}>
            {columns.map(column => (
              <TableHeaderCell
                key={column.key}
                $sortable={column.sortable || sortable}
                $align={column.align || 'left'}
                $compact={compact}
                $width={column.width}
                $minWidth={column.minWidth}
                $maxWidth={column.maxWidth}
                onClick={() => handleSort(column)}
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
            >
              {columns.map(column => {
                const accessor = column.accessor || column.key;

                const value = getValue(row, accessor);

                return (
                  <TableCell key={column.key} $align={column.align || 'left'} $compact={compact}>
                    {column.render ? column.render(value, row, index) : value}
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
