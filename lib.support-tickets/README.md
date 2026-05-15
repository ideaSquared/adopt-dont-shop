# @adopt-dont-shop/lib.support-tickets

Customer-support ticket management: schemas, service client, React Query hooks, and display utilities.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.support-tickets": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list.

### Service

- **`SupportTicketService`** — class client over the `/api/v1/support-tickets` endpoints
- **`supportTicketService`** — ready-to-use singleton

Core methods: `getTickets`, `getTicketById`, `getTicketStats`, `getMyTickets`, `createTicket`, `updateTicket`, `assignTicket`, `addResponse`, `escalateTicket`, `getTicketMessages`, `closeTicket`, `resolveTicket`, `reopenTicket`, `setPriority`, `rateTicket`.

### React Query hooks

- `useTickets(filters)` — list with filters
- `useTicketDetail(ticketId)` — single ticket
- `useTicketStats()` — aggregated counts
- `useMyTickets(status?)` — current user's tickets
- `useTicketMutations()` — create / update / assign / respond / close / resolve / reopen / escalate / setPriority / rate

### Utilities

`getCategoryLabel`, `getStatusLabel`, `getPriorityLabel`, `getPriorityColor`, `getStatusColor`, `formatDate`, `formatRelativeTime`, `calculateResolutionTime`, `isTicketOverdue`, `getTicketAge`, `formatDuration`, `buildQueryString`, `getCategoryIcon`, `needsAttention`, `formatTicketId`.

### Schemas & types

`export * from './schemas'` — Zod schemas and their inferred types (ticket, filters, request/response shapes, enums).

## Quick start

```tsx
import {
  useMyTickets,
  useTicketMutations,
  getStatusLabel,
  getPriorityColor,
} from '@adopt-dont-shop/lib.support-tickets';

export function MyTickets() {
  const { data: tickets, isLoading } = useMyTickets();
  const { createTicket } = useTicketMutations();

  if (isLoading) return <p>Loading…</p>;

  return (
    <ul>
      {tickets?.map((t) => (
        <li key={t.ticketId} style={{ color: getPriorityColor(t.priority) }}>
          {t.subject} — {getStatusLabel(t.status)}
        </li>
      ))}
    </ul>
  );
}
```

## Scripts (from `lib.support-tickets/`)

```bash
npm run build           # tsc
npm run dev             # tsc --watch
npm test                # vitest run
npm run test:watch
npm run test:coverage
npm run lint
npm run type-check
```

## Resources

- Source of truth for exports: [src/index.ts](./src/index.ts)
- Service implementation: [src/support-ticket-service.ts](./src/support-ticket-service.ts)
- Zod schemas: [src/schemas.ts](./src/schemas.ts)
