# Table Component

A flexible and feature-rich table component with sorting, filtering, and pagination capabilities.

## Usage

```tsx
import { Table } from '@/components/data/Table'

// Basic usage
<Table
  columns={columns}
  data={data}
/>

// With advanced features
<Table
  columns={columns}
  data={data}
  sortable={true}
  filterable={true}
  pagination={{
    pageSize: 10,
    showSizeChanger: true
  }}
  className="custom-table"
/>
```

## Props

- `columns`: Array of column configurations
- `data`: Array of data objects to display
- `sortable`: Enable column sorting
- `filterable`: Enable column filtering
- `pagination`: Pagination configuration object
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying table element

## Features

- Column sorting
- Data filtering
- Pagination support
- Responsive design
- Row selection
- Custom cell renderers
- Accessible markup
- TypeScript support
