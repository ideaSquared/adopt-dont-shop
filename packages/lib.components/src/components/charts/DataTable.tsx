import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChartFrame, type ChartFrameProps } from './ChartFrame';
import { SkeletonTableRow } from '../ui/Skeleton';
import * as styles from './DataTable.css';

export type DataTableColumn = {
  key: string;
  label: string;
  /** Optional renderer for non-trivial cells. */
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  /**
   * Whether the header drives sorting. Defaults to `true`, preserving the
   * original behaviour where every column header is a sort control.
   */
  sortable?: boolean;
};

export type SortDirection = 'asc' | 'desc';

/** Highlight tone for a row, applied via a token-based recipe (not inline styles). */
export type DataTableRowVariant = 'default' | 'success' | 'warning' | 'danger';

export type DataTableProps = Omit<ChartFrameProps, 'children' | 'isEmpty' | 'title'> & {
  /** Optional in frameless mode; otherwise shown as the ChartFrame heading. */
  title?: string;
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  pageSize?: number;
  /**
   * When true, the body renders skeleton rows instead of data (initial load),
   * so a load in progress reads as "loading" rather than "empty". Works in
   * frameless mode too, unlike ChartFrame's framed `isLoading` text state.
   */
  loading?: boolean;
  /** Optional callback when a row is clicked (used for drill-down). */
  onRowClick?: (row: Record<string, unknown>) => void;
  /**
   * Small-screen behaviour. `'scroll'` (default) keeps the table and lets it
   * scroll horizontally; `'cards'` collapses each row into a stacked
   * label/value card below the mobile breakpoint.
   */
  responsive?: 'scroll' | 'cards';

  // ── Row selection (opt-in, controlled) ─────────────────────────────────
  /** Render a leading checkbox column + header select-all checkbox. */
  selectable?: boolean;
  /** The currently-selected row ids (controlled). */
  selectedIds?: readonly string[] | ReadonlySet<string>;
  /** Called with the next full selection whenever a checkbox toggles. */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Derives a stable id for a row (defaults to `row.id`, falling back to index). */
  getRowId?: (row: Record<string, unknown>, index: number) => string;
  /**
   * Accessible label for a row's selection checkbox. Defaults to
   * `Select row <id>` so each checkbox has a distinct name; supply this for a
   * human-friendly label (e.g. the row's name).
   */
  getRowLabel?: (row: Record<string, unknown>, index: number) => string;

  // ── Controlled (server-side) sort (opt-in) ─────────────────────────────
  /** When `onSortChange` is provided the table stops sorting locally. */
  sortBy?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (key: string, direction: SortDirection) => void;

  // ── Controlled (server-side) pagination (opt-in) ───────────────────────
  /** 1-based page index; when provided with `total`/`onPageChange` the table
   *  stops paginating locally and renders the given rows as the current page. */
  page?: number;
  total?: number;
  onPageChange?: (page: number) => void;

  // ── Per-row highlighting ───────────────────────────────────────────────
  /** Tone applied to a row (valid / duplicate / invalid style states). */
  getRowVariant?: (row: Record<string, unknown>, index: number) => DataTableRowVariant | undefined;
  /** Escape hatch for an additional per-row class. */
  rowClassName?: (row: Record<string, unknown>, index: number) => string | undefined;

  /** Render the bare table without the ChartFrame chrome (title/border/states). */
  frameless?: boolean;
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

const toIdSet = (ids?: readonly string[] | ReadonlySet<string>): Set<string> => {
  if (!ids) {
    return new Set<string>();
  }
  return new Set<string>(ids);
};

const defaultGetRowId = (row: Record<string, unknown>, index: number): string => {
  const id = row.id;
  return id === undefined || id === null ? String(index) : String(id);
};

const SKELETON_ROW_COUNT = 5;

export const DataTable: React.FC<DataTableProps> = ({
  title,
  columns,
  rows,
  pageSize = 25,
  loading = false,
  onRowClick,
  responsive = 'scroll',
  selectable = false,
  selectedIds,
  onSelectionChange,
  getRowId,
  getRowLabel,
  sortBy,
  sortDirection,
  onSortChange,
  page,
  total,
  onPageChange,
  getRowVariant,
  rowClassName,
  frameless = false,
  ...frame
}) => {
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDir, setInternalSortDir] = useState<SortDirection>('asc');
  const [internalPage, setInternalPage] = useState(0);

  const controlledSort = onSortChange !== undefined;
  const controlledPagination =
    page !== undefined && total !== undefined && onPageChange !== undefined;

  const activeSortKey = controlledSort ? (sortBy ?? null) : internalSortKey;
  const activeSortDir: SortDirection = controlledSort ? (sortDirection ?? 'asc') : internalSortDir;

  const sortedRows = useMemo(() => {
    if (controlledSort || !internalSortKey) {
      return rows;
    }
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp = compareCells(a[internalSortKey], b[internalSortKey]);
      return internalSortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, internalSortKey, internalSortDir, controlledSort]);

  const pageCount = controlledPagination
    ? Math.max(1, Math.ceil((total ?? 0) / pageSize))
    : Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPageIndex = controlledPagination
    ? Math.min(pageCount - 1, Math.max(0, (page ?? 1) - 1))
    : Math.min(internalPage, pageCount - 1);
  const visibleRows = controlledPagination
    ? sortedRows
    : sortedRows.slice(currentPageIndex * pageSize, (currentPageIndex + 1) * pageSize);

  const getRowIdFn = getRowId ?? defaultGetRowId;
  const selectedSet = useMemo(() => toIdSet(selectedIds), [selectedIds]);
  const visibleIds = visibleRows.map((row, i) => getRowIdFn(row, i));
  const selectedVisibleCount = visibleIds.filter(id => selectedSet.has(id)).length;
  const allVisibleSelected = visibleRows.length > 0 && selectedVisibleCount === visibleRows.length;
  const someVisibleSelected = selectedVisibleCount > 0;

  const handleSort = (key: string): void => {
    if (controlledSort) {
      const nextDir: SortDirection =
        activeSortKey === key && activeSortDir === 'asc' ? 'desc' : 'asc';
      onSortChange?.(key, nextDir);
      return;
    }
    if (internalSortKey === key) {
      setInternalSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setInternalSortKey(key);
      setInternalSortDir('asc');
    }
  };

  const toggleOne = (id: string): void => {
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange?.(Array.from(next));
  };

  const toggleAll = (): void => {
    const next = new Set(selectedSet);
    if (allVisibleSelected) {
      visibleIds.forEach(id => next.delete(id));
    } else {
      visibleIds.forEach(id => next.add(id));
    }
    onSelectionChange?.(Array.from(next));
  };

  const goToPage = (nextPage: number): void => {
    if (controlledPagination) {
      onPageChange?.(nextPage + 1);
      return;
    }
    setInternalPage(nextPage);
  };

  const content = (
    <div className={styles.scrollContainer}>
      <table className={clsx(styles.table, responsive === 'cards' && styles.cardsTable)}>
        <thead>
          <tr>
            {selectable ? (
              <th className={styles.selectHeaderCell}>
                <input
                  type='checkbox'
                  className={styles.checkbox}
                  aria-label='Select all'
                  checked={allVisibleSelected}
                  ref={el => {
                    if (el) {
                      el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }
                  }}
                  onChange={toggleAll}
                />
              </th>
            ) : null}
            {columns.map(col => {
              const sortable = col.sortable ?? true;
              if (!sortable) {
                return (
                  <th key={col.key} className={styles.th} data-testid={`th-${col.key}`}>
                    <span className={styles.headerLabel}>{col.label}</span>
                  </th>
                );
              }
              const isSorted = activeSortKey === col.key;
              const ariaSort: 'ascending' | 'descending' | 'none' = isSorted
                ? activeSortDir === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none';
              return (
                <th
                  key={col.key}
                  className={styles.th}
                  data-testid={`th-${col.key}`}
                  aria-sort={ariaSort}
                >
                  <button
                    type='button'
                    className={styles.sortButton}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {isSorted ? (activeSortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
                <SkeletonTableRow
                  key={`skeleton-${i}`}
                  columnCount={columns.length}
                  hasCheckbox={selectable}
                />
              ))
            : visibleRows.map((row, i) => {
                const rowId = getRowIdFn(row, i);
                const isSelected = selectable && selectedSet.has(rowId);
                const variant = getRowVariant?.(row, i) ?? 'default';
                return (
                  <tr
                    key={rowId}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    data-variant={variant === 'default' ? undefined : variant}
                    className={clsx(
                      onRowClick ? styles.rowClickable : styles.rowDefault,
                      styles.rowVariant({ variant, selected: isSelected }),
                      rowClassName?.(row, i)
                    )}
                  >
                    {selectable ? (
                      <td className={styles.selectCell} onClick={e => e.stopPropagation()}>
                        <input
                          type='checkbox'
                          className={styles.checkbox}
                          aria-label={
                            getRowLabel ? `Select ${getRowLabel(row, i)}` : `Select row ${rowId}`
                          }
                          checked={selectedSet.has(rowId)}
                          onChange={() => toggleOne(rowId)}
                        />
                      </td>
                    ) : null}
                    {columns.map(col => (
                      <td key={col.key} className={styles.td} data-label={col.label}>
                        {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
      {pageCount > 1 ? (
        <div className={styles.pagination}>
          <button
            type='button'
            disabled={currentPageIndex === 0}
            onClick={() => goToPage(Math.max(0, currentPageIndex - 1))}
          >
            Prev
          </button>
          <span>
            Page {currentPageIndex + 1} of {pageCount}
          </span>
          <button
            type='button'
            disabled={currentPageIndex >= pageCount - 1}
            onClick={() => goToPage(Math.min(pageCount - 1, currentPageIndex + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );

  if (frameless) {
    if (!loading && rows.length === 0) {
      return <div className={styles.emptyFrameless}>{frame.emptyMessage ?? 'No data'}</div>;
    }
    return content;
  }

  return (
    <ChartFrame {...frame} title={title ?? ''} isEmpty={!loading && rows.length === 0}>
      {content}
    </ChartFrame>
  );
};
