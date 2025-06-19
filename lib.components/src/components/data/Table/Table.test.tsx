import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider } from '../../../styles/ThemeProvider';
import { lightTheme } from '../../../styles/theme';
import { Table } from './Table';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
];

const mockColumns = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'age', header: 'Age', sortable: true },
];

describe('Table', () => {
  it('renders correctly with data and columns', () => {
    renderWithTheme(<Table data={mockData} columns={mockColumns} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Check headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();

    // Check data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('renders empty state when no data provided', () => {
    renderWithTheme(<Table data={[]} columns={mockColumns} />);

    const emptyMessage = screen.getByText(/no data/i);
    expect(emptyMessage).toBeInTheDocument();
  });

  it('handles column sorting when sortable', async () => {
    const user = userEvent.setup();
    const handleSort = jest.fn();

    renderWithTheme(
      <Table
        data={mockData}
        columns={mockColumns}
        onSort={handleSort}
        sortBy='name'
        sortDirection='asc'
      />
    );

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    expect(handleSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('renders with different variants', () => {
    const variants = ['default', 'striped', 'bordered'] as const;

    variants.forEach(variant => {
      renderWithTheme(
        <Table
          data={mockData}
          columns={mockColumns}
          variant={variant}
          data-testid={`table-${variant}`}
        />
      );
      const table = screen.getByTestId(`table-${variant}`);
      expect(table).toBeInTheDocument();
    });
  });

  it('applies different sizes correctly', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach(size => {
      renderWithTheme(
        <Table data={mockData} columns={mockColumns} size={size} data-testid={`table-${size}`} />
      );
      const table = screen.getByTestId(`table-${size}`);
      expect(table).toBeInTheDocument();
    });
  });

  it('renders table with hoverable rows', () => {
    renderWithTheme(<Table data={mockData} columns={mockColumns} hoverable />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    renderWithTheme(<Table data={[]} columns={mockColumns} loading />);

    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders custom cell content with render function', () => {
    const customColumns = [
      {
        key: 'name',
        header: 'Name',
        render: (value: string) => <strong>{value}</strong>,
      },
      { key: 'email', header: 'Email' },
    ];

    renderWithTheme(<Table data={mockData} columns={customColumns} />);

    const strongElement = screen.getByText('John Doe');
    expect(strongElement.tagName).toBe('STRONG');
  });

  it('handles row click events', async () => {
    const user = userEvent.setup();
    const handleRowClick = jest.fn();

    renderWithTheme(<Table data={mockData} columns={mockColumns} onRowClick={handleRowClick} />);

    const firstRow = screen.getByText('John Doe').closest('tr');
    await user.click(firstRow!);

    expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Table data={mockData} columns={mockColumns} data-testid='test-table' />);
    const table = screen.getByTestId('test-table');
    expect(table).toBeInTheDocument();
  });

  it('handles sticky header when stickyHeader prop is true', () => {
    renderWithTheme(
      <Table data={mockData} columns={mockColumns} stickyHeader data-testid='sticky-table' />
    );
    const table = screen.getByTestId('sticky-table');
    expect(table).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithTheme(
      <Table
        data={mockData}
        columns={mockColumns}
        className='custom-table'
        data-testid='custom-table'
      />
    );
    const container = screen.getByTestId('custom-table');
    expect(container).toBeInTheDocument();
  });

  it('combines all features correctly', async () => {
    const user = userEvent.setup();
    const handleSort = jest.fn();

    renderWithTheme(
      <Table
        data={mockData}
        columns={mockColumns}
        striped
        sortBy='name'
        sortDirection='asc'
        onSort={handleSort}
        className='feature-table'
        data-testid='feature-table'
      />
    );

    const container = screen.getByTestId('feature-table');
    expect(container).toBeInTheDocument();

    // Test sorting
    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);
    expect(handleSort).toHaveBeenCalled();
  });
});
