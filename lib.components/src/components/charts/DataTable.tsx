import React, { useMemo, useState } from 'react';
import { ChartFrame, type ChartFrameProps } from './ChartFrame';
import * as styles from './DataTable.css';

export type DataTableColumn = {
  key: string;
  label: string;
  /** Optional renderer for non-trivial cells. */
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
};

export type DataTableProps = Omit<ChartFrameProps, 'children' | 'isEmpty'> & {
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  pageSize?: number;
  /** Optional callback when a row is clicked (used for drill-down). */
  onRowClick?: (row: Record<string, unknown>) => void;
};

const compareCells = (a: unknown, b: unknown): number => {
  if (a === b) {
    return 0;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a ?? '').localeCompare(String(b ?? ''));
};

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  pageSize = 25,
  onRowClick,
  ...frame
}) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return rows;
    }
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp = compareCells(a[sortKey], b[sortKey]);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = sortedRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = (key: string): void => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <ChartFrame {...frame} isEmpty={rows.length === 0}>
      <div className={styles.scrollContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={styles.th}
                  onClick={() => handleSort(col.key)}
                  data-testid={`th-${col.key}`}
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? styles.rowClickable : styles.rowDefault}
              >
                {columns.map(col => (
                  <td key={col.key} className={styles.td}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 ? (
          <div className={styles.pagination}>
            <button
              type='button'
              disabled={safePage === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <span>
              Page {safePage + 1} of {totalPages}
            </span>
            <button
              type='button'
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </ChartFrame>
  );
};
