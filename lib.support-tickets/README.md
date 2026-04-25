# @adopt-dont-shop/lib.support-tickets

Client library for the support-ticket subsystem: Zod-validated schemas, a `SupportTicketService` API wrapper, React Query hooks, and presentation utilities (label / colour / formatter helpers).

## Installation

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.support-tickets": "*"
  }
}
```

Run `npm install` at the repo root to link the workspace.

## Public Exports

From [`lib.support-tickets/src/index.ts`](./src/index.ts):

### Service

- `SupportTicketService` — class
- `supportTicketService` — default singleton instance

### Hooks (React Query)

- `useTickets`
- `useTicketDetail`
- `useTicketStats`
- `useMyTickets`
- `useTicketMutations`

### Utilities

`getCategoryLabel`, `getStatusLabel`, `getPriorityLabel`, `getPriorityColor`, `getStatusColor`, `formatDate`, `formatRelativeTime`, `calculateResolutionTime`, `isTicketOverdue`, `getTicketAge`, `formatDuration`, `buildQueryString`, `getCategoryIcon`, `needsAttention`, `formatTicketId`.

### Schemas & Types

All Zod schemas and inferred types from `./schemas`, including:

- `TicketStatusSchema` — `open | in_progress | waiting_for_user | resolved | closed | escalated`
- `TicketPrioritySchema` — `low | normal | high | urgent | critical`
- `TicketCategorySchema` — covers technical, account, adoption, payment, feature-request, bug-report, general, compliance, data, other
- `ResponderTypeSchema` — `staff | user`

## Service Method Surface

From [`lib.support-tickets/src/support-ticket-service.ts`](./src/support-ticket-service.ts):

- `getTickets(filters?)`, `getTicketById(id)`, `getTicketStats()`, `getMyTickets(status?)`
- `createTicket(data)`, `updateTicket(id, data)`
- `assignTicket(id, data)`, `addResponse(id, data)`, `escalateTicket(id, data)`
- `getTicketMessages(id)`
- `closeTicket(id, notes?)`, `resolveTicket(id, notes?)`, `reopenTicket(id, notes?)`
- `setPriority(...)`, `rateTicket(id, data)`

## Quick Start

### Direct service use

```typescript
import { supportTicketService } from '@adopt-dont-shop/lib.support-tickets';

const tickets = await supportTicketService.getMyTickets();
await supportTicketService.createTicket({
  category: 'technical_issue',
  priority: 'normal',
  subject: 'Cannot upload pet photos',
  description: 'Upload fails with a 500.',
});
```

### React hooks

```tsx
import { useMyTickets, useTicketMutations } from '@adopt-dont-shop/lib.support-tickets';

function MyTickets() {
  const { data: tickets, isLoading } = useMyTickets();
  const { createTicket } = useTicketMutations();

  if (isLoading) return <Spinner />;
  return <TicketList items={tickets} onNew={createTicket.mutate} />;
}
```

## Development

```bash
npx turbo build --filter=@adopt-dont-shop/lib.support-tickets
npx turbo test  --filter=@adopt-dont-shop/lib.support-tickets
npx turbo lint  --filter=@adopt-dont-shop/lib.support-tickets
```
