import React, { useState } from 'react';
import styled from 'styled-components';
import {
  FiChevronUp,
  FiChevronDown,
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

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

const TableContainer = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
`;

const Th = styled.th<{
  $width?: string;
  $align?: 'left' | 'center' | 'right';
  $sortable?: boolean;
}>`
  padding: 1rem;
  text-align: ${props => props.$align || 'left'};
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
  width: ${props => props.$width || 'auto'};
  cursor: ${props => (props.$sortable ? 'pointer' : 'default')};
  user-select: none;
  transition: background 0.2s ease;

  &:hover {
    background: ${props => (props.$sortable ? '#f3f4f6' : 'transparent')};
  }
`;

const ThContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-start;
`;

const SortIcon = styled.span`
  display: flex;
  align-items: center;
  color: #9ca3af;

  svg {
    font-size: 1rem;
  }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ $clickable?: boolean }>`
  border-bottom: 1px solid #e5e7eb;
  cursor: ${props => (props.$clickable ? 'pointer' : 'default')};
  transition: background 0.2s ease;

  &:hover {
    background: ${props => (props.$clickable ? '#f9fafb' : 'transparent')};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td<{ $align?: 'left' | 'center' | 'right' }>`
  padding: 1rem;
  text-align: ${props => props.$align || 'left'};
  font-size: 0.875rem;
  color: #111827;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: ${props => props.theme.colors.primary[600]};
`;

const LoadingRow = styled.tr`
  td {
    padding: 3rem;
    text-align: center;
    color: #6b7280;
  }
`;

const EmptyRow = styled.tr`
  td {
    padding: 3rem;
    text-align: center;
    color: #6b7280;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PageButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 0.5rem;
  background: ${props => (props.$active ? props.theme.colors.primary[600] : '#ffffff')};
  color: ${props => (props.$active ? '#ffffff' : '#374151')};
  border: 1px solid ${props => (props.$active ? props.theme.colors.primary[600] : '#d1d5db')};
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => (props.$active ? props.theme.colors.primary[700] : '#f9fafb')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 1rem;
  }
`;

export function DataTable<T extends Record<string, any>>({
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
  getRowId = row => row.id || String(Math.random()),
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
    return row[column.accessor];
  };

  const allSelected = data.length > 0 && data.every(row => selectedRows.has(getRowId(row)));

  return (
    <TableContainer>
      <TableWrapper>
        <Table>
          <Thead>
            <tr>
              {selectable && (
                <Th $width='48px' $align='center'>
                  <Checkbox
                    checked={allSelected}
                    onChange={e => handleSelectAll(e.target.checked)}
                  />
                </Th>
              )}
              {columns.map(column => (
                <Th
                  key={column.id}
                  $width={column.width}
                  $align={column.align}
                  $sortable={column.sortable}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <ThContent>
                    {column.header}
                    {column.sortable && (
                      <SortIcon>
                        {(sortColumn || localSort?.column) === column.id ? (
                          (sortDirection || localSort?.direction) === 'asc' ? (
                            <FiChevronUp />
                          ) : (
                            <FiChevronDown />
                          )
                        ) : (
                          <FiChevronDown style={{ opacity: 0.3 }} />
                        )}
                      </SortIcon>
                    )}
                  </ThContent>
                </Th>
              ))}
            </tr>
          </Thead>
          <Tbody>
            {loading ? (
              <LoadingRow>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>Loading...</td>
              </LoadingRow>
            ) : data.length === 0 ? (
              <EmptyRow>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>{emptyMessage}</td>
              </EmptyRow>
            ) : (
              data.map(row => {
                const rowId = getRowId(row);
                return (
                  <Tr
                    key={rowId}
                    $clickable={!!onRowClick}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {selectable && (
                      <Td $align='center' onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRows.has(rowId)}
                          onChange={e => handleSelectRow(rowId, e.target.checked)}
                        />
                      </Td>
                    )}
                    {columns.map(column => (
                      <Td key={column.id} $align={column.align}>
                        {getCellValue(row, column)}
                      </Td>
                    ))}
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </TableWrapper>

      {onPageChange && totalPages > 1 && (
        <PaginationContainer>
          <PaginationInfo>
            Page {currentPage} of {totalPages}
          </PaginationInfo>
          <PaginationControls>
            <PageButton
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              aria-label='First page'
            >
              <FiChevronsLeft />
            </PageButton>
            <PageButton
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label='Previous page'
            >
              <FiChevronLeft />
            </PageButton>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
              return (
                <PageButton
                  key={pageNum}
                  $active={currentPage === pageNum}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </PageButton>
              );
            })}

            <PageButton
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label='Next page'
            >
              <FiChevronRight />
            </PageButton>
            <PageButton
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              aria-label='Last page'
            >
              <FiChevronsRight />
            </PageButton>
          </PaginationControls>
        </PaginationContainer>
      )}
    </TableContainer>
  );
}
