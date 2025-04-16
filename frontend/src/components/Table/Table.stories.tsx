import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import Button from '../Button' // Keeping default import for Button
import Table from './Table' // Corrected to default import

const meta = {
  title: 'Components/Table',
  component: Table,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  // Add optional args for pagination
  args: {
    onPageChange: fn(),
  },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

const onEdit = fn()
const onDelete = fn()

// Define table content as JSX
const tableHeader = (
  <thead>
    <tr>
      <th>Name</th>
      <th>Age</th>
      <th>City</th>
      <th>Actions</th>
    </tr>
  </thead>
)

const tableBodyContent = (
  // Example data rows
  <>
    <tr>
      <td>Alice</td>
      <td>30</td>
      <td>New York</td>
      <td>
        <Button onClick={() => onEdit('Alice')} style={{ marginRight: '8px' }}>
          Edit
        </Button>
        <Button variant="danger" onClick={() => onDelete('Alice')}>
          Delete
        </Button>
      </td>
    </tr>
    <tr>
      <td>Bob</td>
      <td>24</td>
      <td>San Francisco</td>
      <td>
        <Button onClick={() => onEdit('Bob')} style={{ marginRight: '8px' }}>
          Edit
        </Button>
        <Button variant="danger" onClick={() => onDelete('Bob')}>
          Delete
        </Button>
      </td>
    </tr>
    <tr>
      <td>Charlie</td>
      <td>35</td>
      <td>London</td>
      <td>
        <Button
          onClick={() => onEdit('Charlie')}
          style={{ marginRight: '8px' }}
        >
          Edit
        </Button>
        <Button variant="danger" onClick={() => onDelete('Charlie')}>
          Delete
        </Button>
      </td>
    </tr>
    {/* Add more rows to test pagination */}
    <tr>
      <td>David</td>
      <td>40</td>
      <td>Paris</td>
      <td></td>
    </tr>
    <tr>
      <td>Eve</td>
      <td>28</td>
      <td>Tokyo</td>
      <td></td>
    </tr>
  </>
)

export const Default: Story = {
  args: {
    children: [
      tableHeader,
      <tbody key="default-body">{tableBodyContent}</tbody>,
    ],
    hasActions: true, // Indicate last column contains actions for styling
  },
}

export const Striped: Story = {
  args: {
    children: [
      tableHeader,
      <tbody key="striped-body">{tableBodyContent}</tbody>,
    ],
    striped: true,
    hasActions: true,
  },
}

export const PaginatedClientSide: Story = {
  args: {
    children: [
      tableHeader,
      <tbody key="paginated-body">{tableBodyContent}</tbody>,
    ],
    hasActions: true,
    rowsPerPage: 3, // Enable client-side pagination
  },
}

export const Empty: Story = {
  args: {
    children: [tableHeader, <tbody key="empty-body"></tbody>],
  },
}
