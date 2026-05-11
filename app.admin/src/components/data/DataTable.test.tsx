/**
 * Accessibility tests for DataTable (ADS-127)
 *
 * Verifies the table meets WCAG AA criteria:
 * - Column headers carry scope="col" so screen readers associate them with cells
 * - Sortable headers expose aria-sort so screen reader users know sort direction
 * - Checkboxes have accessible names so screen readers can announce their purpose
 * - Clickable rows are keyboard operable (tabIndex + Enter/Space)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { DataTable, type Column } from './DataTable';

type Row = { id: string; name: string; status: string };

const columns: Column<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true },
  { id: 'status', header: 'Status', accessor: 'status', sortable: false },
];

const rows: Row[] = [
  { id: '1', name: 'Alice', status: 'active' },
  { id: '2', name: 'Bob', status: 'inactive' },
];

describe('DataTable accessibility', () => {
  describe('column headers', () => {
    it('each th has scope="col"', () => {
      render(<DataTable columns={columns} data={rows} />);
      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach(th => {
        expect(th).toHaveAttribute('scope', 'col');
      });
    });

    it('sortable header shows aria-sort="none" by default', () => {
      render(<DataTable columns={columns} data={rows} />);
      const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
      expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('active sort column shows aria-sort="ascending"', () => {
      render(<DataTable columns={columns} data={rows} sortColumn='name' sortDirection='asc' />);
      const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('active sort column shows aria-sort="descending"', () => {
      render(<DataTable columns={columns} data={rows} sortColumn='name' sortDirection='desc' />);
      const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    });

    it('non-sortable header has no aria-sort', () => {
      render(<DataTable columns={columns} data={rows} />);
      const statusHeader = screen.getByRole('columnheader', { name: 'Status' });
      expect(statusHeader).not.toHaveAttribute('aria-sort');
    });
  });

  describe('selectable checkboxes', () => {
    it('select-all checkbox has an accessible label', () => {
      render(<DataTable columns={columns} data={rows} selectable getRowId={r => r.id} />);
      expect(screen.getByRole('checkbox', { name: /select all/i })).toBeInTheDocument();
    });

    it('each row checkbox has an accessible label', () => {
      render(<DataTable columns={columns} data={rows} selectable getRowId={r => r.id} />);
      expect(screen.getByRole('checkbox', { name: /select row 1/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /select row 2/i })).toBeInTheDocument();
    });
  });

  describe('keyboard-operable rows', () => {
    it('clickable rows have tabIndex=0', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable columns={columns} data={rows} onRowClick={onRowClick} getRowId={r => r.id} />
      );
      const dataRows = screen.getAllByRole('row').filter(r => r.getAttribute('tabindex') === '0');
      expect(dataRows.length).toBe(rows.length);
    });

    it('pressing Enter on a clickable row triggers onRowClick', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable columns={columns} data={rows} onRowClick={onRowClick} getRowId={r => r.id} />
      );
      const [firstDataRow] = screen
        .getAllByRole('row')
        .filter(r => r.getAttribute('tabindex') === '0');
      fireEvent.keyDown(firstDataRow, { key: 'Enter' });
      expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    });

    it('pressing Space on a clickable row triggers onRowClick', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable columns={columns} data={rows} onRowClick={onRowClick} getRowId={r => r.id} />
      );
      const [firstDataRow] = screen
        .getAllByRole('row')
        .filter(r => r.getAttribute('tabindex') === '0');
      fireEvent.keyDown(firstDataRow, { key: ' ' });
      expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    });
  });
});
