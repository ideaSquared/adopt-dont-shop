# @adopt-dont-shop/lib.invitations

Staff / volunteer invitation client — send, list, cancel, and accept invitations to rescue organisations.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.invitations": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list.

- **`InvitationsService`** — class client
- **Types** — `InvitationsServiceConfig`, `InvitationsServiceOptions`, plus invitation / pending / accept types re-exported from `./types`

### Key methods

- `sendInvitation(...)` — issue an invitation to an email
- `getPendingInvitations(rescueId)` — rescue-side dashboard listing
- `cancelInvitation(rescueId, invitationId)`
- `getInvitationDetails(token)` — used by the accept page
- `acceptInvitation(payload)` — redeem the token
- `healthCheck()`

## Quick start

```typescript
import { InvitationsService } from '@adopt-dont-shop/lib.invitations';

const invitations = new InvitationsService({ apiUrl: import.meta.env.VITE_API_BASE_URL });

await invitations.sendInvitation({
  rescueId,
  email: 'volunteer@example.com',
  role: 'STAFF',
});
```

## Scripts (from `lib.invitations/`)

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
