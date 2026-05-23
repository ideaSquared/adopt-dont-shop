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
