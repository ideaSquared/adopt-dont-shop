# DataTable

A sortable, paginatable data table built on `ChartFrame`, with opt-in row
selection, server-side sort/pagination, per-row highlighting, and a mobile
`cards` layout. Used for report tables and admin list views.

## Usage

```tsx
import { DataTable, type DataTableColumn } from '@adopt-dont-shop/lib.components';

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status', render: v => <StatusBadge value={v} /> },
];

<DataTable title='Pets' columns={columns} rows={rows} pageSize={20} />;
```

## Props

`DataTableProps` extends `ChartFrameProps` (minus `children` / `isEmpty` /
`title`). Its own props:

| Prop                                        | Type                                           | Required | Default           | Description                                                                    |
| ------------------------------------------- | ---------------------------------------------- | -------- | ----------------- | ------------------------------------------------------------------------------ |
| `columns`                                   | `DataTableColumn[]`                            | Yes      | —                 | Column defs (`key`, `label`, optional `render`, `sortable`, `width`, `align`). |
| `rows`                                      | `Record<string, unknown>[]`                    | Yes      | —                 | Row data.                                                                      |
| `title`                                     | `string`                                       | No       | —                 | `ChartFrame` heading; optional in frameless mode.                              |
| `pageSize`                                  | `number`                                       | No       | —                 | Client-side page size.                                                         |
| `loading`                                   | `boolean`                                      | No       | `false`           | Render skeleton rows instead of data.                                          |
| `onRowClick`                                | `(row) => void`                                | No       | —                 | Row click handler (drill-down).                                                |
| `responsive`                                | `'scroll' \| 'cards'`                          | No       | `'scroll'`        | Small-screen behaviour.                                                        |
| `selectable`                                | `boolean`                                      | No       | `false`           | Render a leading checkbox column.                                              |
| `selectedIds`                               | `readonly string[] \| ReadonlySet<string>`     | No       | —                 | Controlled selection.                                                          |
| `onSelectionChange`                         | `(ids: string[]) => void`                      | No       | —                 | Selection change callback.                                                     |
| `getRowId`                                  | `(row, i) => string`                           | No       | `row.id` → index  | Stable row id.                                                                 |
| `getRowLabel`                               | `(row, i) => string`                           | No       | `Select row <id>` | Accessible checkbox label.                                                     |
| `sortBy` / `sortDirection` / `onSortChange` | —                                              | No       | —                 | Controlled (server-side) sort; disables local sort.                            |
| `page` / `total` / `onPageChange`           | —                                              | No       | —                 | Controlled (server-side) pagination.                                           |
| `getRowVariant`                             | `(row, i) => DataTableRowVariant \| undefined` | No       | —                 | Per-row tone (`default` / `success` / `warning` / `danger`).                   |

## Accessibility

Renders a real `<table>` with header cells; sortable headers are buttons that
toggle sort. In `cards` mode each row collapses to labelled label/value pairs.
Provide `getRowLabel` when `selectable` so each row checkbox has a
human-readable name rather than the default `Select row <id>`.
