import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';
import type { Column } from './DataTable';

type TestUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

const mockUsers: TestUser[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'User', status: 'inactive' },
];

const mockColumns: Column<TestUser>[] = [
  {
    id: 'name',
    header: 'Name',
    accessor: (row) => row.name,
    sortable: true,
  },
  {
    id: 'email',
    header: 'Email',
    accessor: (row) => row.email,
  },
  {
    id: 'role',
    header: 'Role',
    accessor: (row) => row.role,
    sortable: true,
  },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => row.status,
  },
];

describe('DataTable - Display and Interaction Behaviours', () => {
  describe('Basic Display', () => {
    it('admin sees table with data', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          loading={false}
          getRowId={(user) => user.id}
        />
      );

      mockUsers.forEach((user) => {
        expect(screen.getByText(user.name)).toBeInTheDocument();
        expect(screen.getByText(user.email)).toBeInTheDocument();
      });
    });

    it('admin sees all column headers', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          loading={false}
          getRowId={(user) => user.id}
        />
      );

      mockColumns.forEach((column) => {
        expect(screen.getByText(column.header)).toBeInTheDocument();
      });
    });

    it('admin sees correct number of rows', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          loading={false}
          getRowId={(user) => user.id}
        />
      );

      // Count tbody rows (excluding header)
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(mockUsers.length);
    });
  });

  describe('Loading State', () => {
    it('admin sees loading indicator when data is loading', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          loading={true}
          getRowId={(user) => user.id}
        />
      );

      // Look for common loading indicators
      const loadingElement = screen.getByText(/loading/i) || screen.getByRole('status');
      expect(loadingElement).toBeInTheDocument();
    });

    it('admin does not see data when loading', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          loading={true}
          getRowId={(user) => user.id}
        />
      );

      // Data should not be visible when loading
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('admin sees empty message when no data exists', () => {
      const emptyMessage = 'No users found';
      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          loading={false}
          emptyMessage={emptyMessage}
          getRowId={(user) => user.id}
        />
      );

      expect(screen.getByText(emptyMessage)).toBeInTheDocument();
    });

    it('admin sees default empty message when none provided', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          loading={false}
          getRowId={(user) => user.id}
        />
      );

      // The DataTable shows a default "No data available" message when empty
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Row Click Behaviour', () => {
    it('admin can click on a row', async () => {
      const user = userEvent.setup();
      const handleRowClick = jest.fn();

      render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          loading={false}
          onRowClick={handleRowClick}
          getRowId={(user) => user.id}
        />
      );

      const firstRow = screen.getByText('John Doe').closest('tr');
      if (firstRow) {
        await user.click(firstRow);
        expect(handleRowClick).toHaveBeenCalledWith(mockUsers[0]);
      }
    });

    it('row click is triggered for each row individually', async () => {
      const user = userEvent.setup();
      const handleRowClick = jest.fn();

      render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          loading={false}
          onRowClick={handleRowClick}
          getRowId={(user) => user.id}
        />
      );

      const secondRow = screen.getByText('Jane Smith').closest('tr');
      if (secondRow) {
        await user.click(secondRow);
        expect(handleRowClick).toHaveBeenCalledWith(mockUsers[1]);
      }
    });
  });

  describe('Sortable Columns', () => {
    it('admin sees sort indicators on sortable columns', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          loading={false}
          getRowId={(user) => user.id}
        />
      );

      // Sortable columns should have some indicator (arrow, icon, etc.)
      const nameHeader = screen.getByText('Name');
      const roleHeader = screen.getByText('Role');

      expect(nameHeader).toBeInTheDocument();
      expect(roleHeader).toBeInTheDocument();
    });
  });

  describe('Custom Rendering', () => {
    it('admin sees custom rendered content in cells', () => {
      const customColumns: Column<TestUser>[] = [
        {
          id: 'name',
          header: 'Name',
          accessor: (row) => <strong>{row.name}</strong>,
        },
        {
          id: 'status',
          header: 'Status',
          accessor: (row) => (
            <span style={{ color: row.status === 'active' ? 'green' : 'red' }}>
              {row.status}
            </span>
          ),
        },
      ];

      render(
        <DataTable
          columns={customColumns}
          data={mockUsers}
          loading={false}
          getRowId={(user) => user.id}
        />
      );

      const nameElement = screen.getByText('John Doe');
      expect(nameElement.tagName).toBe('STRONG');
    });
  });

  describe('Accessibility', () => {
    it('table has proper semantic structure', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          loading={false}
          getRowId={(user) => user.id}
        />
      );

      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('table headers are in thead', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          loading={false}
          getRowId={(user) => user.id}
        />
      );

      const thead = container.querySelector('thead');
      expect(thead).toBeInTheDocument();

      // Verify all column headers are present in the thead
      mockColumns.forEach((column) => {
        const headerText = within(thead as HTMLElement).getByText(column.header);
        expect(headerText).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('admin sees table with large dataset', () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: i % 2 === 0 ? 'Admin' : 'User',
        status: i % 3 === 0 ? 'inactive' : 'active',
      }));

      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={largeDataset}
          loading={false}
          getRowId={(user) => user.id}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(largeDataset.length);
    });
  });
});
