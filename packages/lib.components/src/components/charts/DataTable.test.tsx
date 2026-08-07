import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { DataTable, type DataTableColumn } from './DataTable';

const renderWithTheme = (component: React.ReactElement) => render(component);

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
];

const rows = [
  { name: 'Bea', age: 4 },
  { name: 'Ada', age: 7 },
  { name: 'Cy', age: 2 },
];

// Rows carrying stable ids for the selection / variant / pagination suites.
const idRows = [
  { id: 'r1', name: 'Bea', age: 4 },
  { id: 'r2', name: 'Ada', age: 7 },
  { id: 'r3', name: 'Cy', age: 2 },
];

describe('DataTable sortable headers', () => {
  it('reports aria-sort="none" on unsorted columns', () => {
    renderWithTheme(<DataTable title='Pets' columns={columns} rows={rows} />);
    expect(screen.getByTestId('th-name')).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByTestId('th-age')).toHaveAttribute('aria-sort', 'none');
  });

  it('toggles aria-sort between ascending and descending on clicks', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DataTable title='Pets' columns={columns} rows={rows} />);

    const headerButton = screen.getByRole('button', { name: /name/i });
    await user.click(headerButton);
    expect(screen.getByTestId('th-name')).toHaveAttribute('aria-sort', 'ascending');

    await user.click(headerButton);
    expect(screen.getByTestId('th-name')).toHaveAttribute('aria-sort', 'descending');
  });

  it('activates sort via the keyboard when the header button is focused', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DataTable title='Pets' columns={columns} rows={rows} />);

    const headerButton = screen.getByRole('button', { name: /age/i });
    headerButton.focus();
    expect(headerButton).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('th-age')).toHaveAttribute('aria-sort', 'ascending');
  });
});

describe('DataTable responsive layout', () => {
  it('exposes each column label on its cells via data-label (for the card layout)', () => {
    renderWithTheme(<DataTable title='Pets' columns={columns} rows={rows} />);

    const cell = screen.getByText('Bea').closest('td');
    expect(cell).toHaveAttribute('data-label', 'Name');
  });

  it('still renders every cell value in cards mode', () => {
    renderWithTheme(<DataTable title='Pets' columns={columns} rows={rows} responsive='cards' />);

    expect(screen.getByText('Bea')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Cy')).toBeInTheDocument();
    expect(screen.getByText('Bea').closest('td')).toHaveAttribute('data-label', 'Name');
  });
});

describe('DataTable row selection', () => {
  it('renders no checkboxes unless selection is enabled', () => {
    renderWithTheme(<DataTable title='Pets' columns={columns} rows={idRows} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('renders a select-all header checkbox and one checkbox per row when selectable', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        selectable
        selectedIds={[]}
        onSelectionChange={vi.fn()}
      />
    );

    expect(screen.getByRole('checkbox', { name: /select all/i })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox', { name: /select row/i })).toHaveLength(3);
  });

  it('select-all selects every visible row', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        selectable
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: /select all/i }));
    expect(onSelectionChange).toHaveBeenCalledWith(['r1', 'r2', 'r3']);
  });

  it('select-all deselects every visible row when already fully selected', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        selectable
        selectedIds={['r1', 'r2', 'r3']}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: /select all/i }));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('shows an indeterminate select-all for a partial selection', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        selectable
        selectedIds={['r1']}
        onSelectionChange={vi.fn()}
      />
    );

    const selectAll = screen.getByRole('checkbox', { name: /select all/i });
    expect(selectAll).not.toBeChecked();
    expect(selectAll).toHaveProperty('indeterminate', true);
  });

  it('checks (and clears indeterminate on) the select-all when all rows are selected', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        selectable
        selectedIds={['r1', 'r2', 'r3']}
        onSelectionChange={vi.fn()}
      />
    );

    const selectAll = screen.getByRole('checkbox', { name: /select all/i });
    expect(selectAll).toBeChecked();
    expect(selectAll).toHaveProperty('indeterminate', false);
  });

  it('toggling one row adds it to the existing selection', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        selectable
        selectedIds={['r1']}
        onSelectionChange={onSelectionChange}
      />
    );

    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
    await user.click(rowCheckboxes[1]);
    expect(onSelectionChange).toHaveBeenCalledWith(['r1', 'r2']);
  });

  it('gives each row checkbox a distinct accessible name (via row id by default)', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        selectable
        selectedIds={[]}
        onSelectionChange={vi.fn()}
      />
    );

    expect(screen.getByRole('checkbox', { name: 'Select row r1' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row r2' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row r3' })).toBeInTheDocument();
  });

  it('labels row checkboxes via getRowLabel when provided', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        selectable
        selectedIds={[]}
        onSelectionChange={vi.fn()}
        getRowLabel={row => `pet ${String(row.name)}`}
      />
    );

    expect(screen.getByRole('checkbox', { name: 'Select pet Bea' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select pet Ada' })).toBeInTheDocument();
  });
});

describe('DataTable controlled sort', () => {
  it('reflects the controlled sortBy/sortDirection in aria-sort', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        sortBy='age'
        sortDirection='desc'
        onSortChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('th-age')).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByTestId('th-name')).toHaveAttribute('aria-sort', 'none');
  });

  it('calls onSortChange on header click and does NOT re-sort rows locally', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        sortBy='name'
        sortDirection='asc'
        onSortChange={onSortChange}
      />
    );

    // Given order is Bea, Ada, Cy — a local asc sort would reorder to Ada first.
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Bea');

    await user.click(screen.getByRole('button', { name: /name/i }));

    // Controlled: the parent is asked to flip direction; rows stay in given order.
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Bea');
  });

  it('does not render a sort button for a non-sortable column', () => {
    const cols: DataTableColumn[] = [
      { key: 'name', label: 'Name' },
      { key: 'actions', label: 'Actions', sortable: false },
    ];
    renderWithTheme(<DataTable title='Pets' columns={cols} rows={idRows} />);

    expect(screen.getByRole('button', { name: /name/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /actions/i })).toBeNull();
  });
});

describe('DataTable controlled pagination', () => {
  it('shows the controlled page info and renders all given rows (no local slice)', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        page={2}
        pageSize={10}
        total={25}
        onPageChange={vi.fn()}
      />
    );

    // ceil(25 / 10) === 3 pages.
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Bea')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Cy')).toBeInTheDocument();
  });

  it('calls onPageChange for Next and Prev', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        page={2}
        pageSize={10}
        total={25}
        onPageChange={onPageChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: /prev/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables Prev on the first page', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        page={1}
        pageSize={10}
        total={25}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('clamps an out-of-range controlled page to the last page for display and nav', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        page={99}
        pageSize={10}
        total={25}
        onPageChange={vi.fn()}
      />
    );

    // ceil(25 / 10) === 3 pages; an out-of-range page 99 clamps to 3.
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});

describe('DataTable row highlighting', () => {
  it('marks a row with the variant returned by getRowVariant', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        getRowVariant={row => (row.id === 'r2' ? 'danger' : 'default')}
      />
    );

    expect(screen.getByText('Ada').closest('tr')).toHaveAttribute('data-variant', 'danger');
    // 'default' rows carry no variant marker.
    expect(screen.getByText('Bea').closest('tr')).not.toHaveAttribute('data-variant');
  });

  it('applies a custom rowClassName to the matching row', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={columns}
        rows={idRows}
        rowClassName={row => (row.id === 'r1' ? 'flagged-row' : undefined)}
      />
    );

    expect(screen.getByText('Bea').closest('tr')?.className).toContain('flagged-row');
    expect(screen.getByText('Ada').closest('tr')?.className).not.toContain('flagged-row');
  });
});

describe('DataTable frameless mode', () => {
  it('omits the ChartFrame chrome (no title heading, no frame test id)', () => {
    renderWithTheme(<DataTable title='Pets' columns={columns} rows={idRows} frameless />);

    expect(screen.queryByTestId('chart-frame')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Pets' })).toBeNull();
    // The table itself still renders.
    expect(screen.getByText('Bea')).toBeInTheDocument();
  });
});

describe('DataTable loading state', () => {
  it('renders skeleton rows while loading, so a load reads as loading not empty', () => {
    renderWithTheme(<DataTable title='Pets' columns={columns} rows={[]} loading />);
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(5);
    // No empty state while loading.
    expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument();
  });

  it('shows real rows (no skeletons) once loaded', () => {
    renderWithTheme(<DataTable title='Pets' columns={columns} rows={idRows} />);
    expect(screen.queryAllByTestId('skeleton-row')).toHaveLength(0);
    expect(screen.getByText('Bea')).toBeInTheDocument();
  });
});

describe('DataTable column width + alignment', () => {
  it('applies per-column width and alignment to the header cell', () => {
    renderWithTheme(
      <DataTable
        title='Pets'
        columns={[{ key: 'name', label: 'Name', width: '200px', align: 'center' }]}
        rows={idRows}
      />
    );
    expect(screen.getByTestId('th-name')).toHaveStyle({ width: '200px', textAlign: 'center' });
  });
});
