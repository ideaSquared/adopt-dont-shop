# @adopt-dont-shop/lib.applications

Adoption-application lifecycle client — submit, update, transition stage, and manage supporting documents.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.applications": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list.

- **`ApplicationsService`** — class client
- **`applicationsService`** — ready-to-use singleton
- **Types** — `Application`, `ApplicationData`, `ApplicationStatus`, `ApplicationPriority`, `ApplicationWithPetInfo`, `Document`, `DocumentUpload`, `ApplicationsServiceConfig`

### Key methods

Applicant-side:

- `submitApplication(data)`, `updateApplication(id, updates)`, `withdrawApplication(id, reason?)`
- `getApplicationById(id)`, `getUserApplications(userId?)`, `getApplicationByPetId(petId)`

Rescue / staff:

- `getRescueApplications(...)` — list with filters
- `updateApplicationStatus(id, status, notes?)`
- `getApplicationStats(rescueId?)`

Documents:

- `uploadDocument(applicationId, file, type)`
- `removeDocument(applicationId, documentId)`
- `getDocuments(applicationId)`

## Quick start

```typescript
import { applicationsService } from '@adopt-dont-shop/lib.applications';

const application = await applicationsService.submitApplication({
  petId,
  answers: { /* … */ },
});

await applicationsService.uploadDocument(application.applicationId, file, 'proof_of_address');
```

## Scripts (from `lib.applications/`)

```bash
npm run build           # tsc
npm run dev             # tsc --watch
npm test                # jest
npm run test:watch
npm run test:coverage
npm run lint
npm run type-check
```

## Resources

- Central docs: [docs/libraries/applications.md](../docs/libraries/applications.md)
- Source of truth for exports: [src/index.ts](./src/index.ts)
