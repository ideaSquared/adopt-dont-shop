# Product Requirements Document: Rescue App

## Overview

The Rescue App is the operational hub for rescue organizations to manage pets, review adoption applications, communicate with adopters, and oversee day-to-day rescue operations.

## Target Users

- **Primary**: Rescue staff with admin permissions
- **Secondary**: General rescue staff and volunteers (server-side role: `rescue_staff`)

*Note on roles:* The backend has a single `rescue_staff` `UserRole`. Finer permission granularity (admin vs staff vs volunteer within a rescue) is enforced **client-side** via `PermissionsContext` fallback maps (`rescue_admin`, `rescue_staff`, `rescue_volunteer` permission sets). There is no separate `rescue_manager` or `volunteer` `UserRole`.

## Key Features

### 1. Pet Management

- Pet database with detailed profiles
- Pet registration form with photos
- Status tracking via `PetStatusTransition` (`AVAILABLE / PENDING / ADOPTED / FOSTER / MEDICAL_HOLD / BEHAVIORAL_HOLD / NOT_AVAILABLE / DECEASED`)
- Photo management (up to 10, reorder, primary)
- Behavioural / temperament data captured as Pet columns
- CSV import via `PetCsvImportModal` — discoverable from both the
  Pet Management header and the empty state (ADS-646). Column format
  and operational notes live in [docs/operations/pet-csv-import.md](../operations/pet-csv-import.md).

*Out of scope / roadmap:* Dedicated medical-records timeline UI, dedicated vaccination tracking UI, dedicated behavioural-assessment workflow. Schema supports these as inline fields; rich UI is a future enhancement.

### 2. Application Management

**Backend status model (authoritative):**

`ApplicationStatus = SUBMITTED | APPROVED | REJECTED | WITHDRAWN`

**Frontend stage presentation (UI-only):**

For richer UX, the rescue app maps backend status + side-effects (home visits, reference checks) into a derived 5-stage view via `applicationService.ts:mapStatusToStage`:

`PENDING → REVIEWING → VISITING → DECIDING → RESOLVED`

These stages are **display-only**; they do not persist as a backend column. Stage transitions in the UI translate to status changes (only the SUBMITTED → {APPROVED, REJECTED, WITHDRAWN} transitions are accepted by the backend). Final-outcome `CONDITIONAL` is not currently supported and is on roadmap (would require backend status model change).

**Core Features:**

- Comprehensive application review (tabs: details / references / visits / timeline)
- Reference checking tools
- Home visit scheduling with outcome propagation
- Decision tracking with audit trail via `ApplicationTimeline`
- Communication history with applicants (via Communication page)
- **Bulk operations**: selection checkboxes + bulk approve/reject/withdraw via `BulkActionToolbar` (mirrors admin pattern; calls existing `performBulkAction` service method)
- Application analytics
- Custom question management per rescue (`QuestionsBuilder`)

### 3. Rescue Configuration

- Customize application questions via `QuestionsBuilder`
- Configure adoption policies via `AdoptionPolicyForm`
- Manage rescue contact information via `RescueProfileForm`
- Staff management via `StaffManagement` (add/remove/edit/invite)
- Notification preferences via `NotificationPreferencesForm`

*Out of scope / roadmap:* Public rescue profile editor, in-app role/permission assignment UI (permissions managed via backend RBAC), volunteer-specific UX, message templates.

### 4. Communication Tools

- Direct messaging with adopters via `lib.chat` (`ConversationList` + `ChatWindow`)
- Conversation filter: active / resolved
- Email/push/SMS preferences toggleable via `NotificationPreferencesForm` (backend handles delivery)

*Out of scope / roadmap:* Internal staff chat, message templates library, searchable conversation archive (search within messages), announcements broadcast.

### 5. Analytics & Reporting

- **Reachable from sidebar nav** (Analytics + Reports links wired)
- Adoption metrics + success rates (`AdoptionMetricsChart`)
- Application analytics + conversion funnel (`ConversionFunnelChart`, `StageDistributionChart`)
- Pet performance tracking
- Response time monitoring (`ResponseTimeChart`)
- Custom report generation via `lib.analytics` (`useReports`, `useReportTemplates`, scheduling, token shares)
- CSV + PDF export via `analyticsService.exportToCSV/exportToPDF`

*Out of scope / roadmap:* Financial reporting, Excel export.

### 6. Staff Management

- Staff directory and profiles (`StaffOverview`, `StaffList`)
- Add/edit/remove staff
- Invite flow (`InviteStaffModal`, `PendingInvitations`, `AcceptInvitation`)

*Out of scope / roadmap:* Role/permission assignment UI, activity tracking UI, training management, schedule coordination, internal messaging / announcements.

### 7. Event Management

- Create/list adoption events, fundraisers, meet-and-greets (`Events.tsx`)
- Calendar view (`EventCalendar`)

*Out of scope / roadmap:* External calendar integration (Google/iCal), event analytics surfaced in UI, training-specific event types.

### 8. Foster Coordination

- **`FosterCoordination` page** with list of active and historical placements
- Create placement: select pet + foster user, start date, notes → triggers Pet status transition to `FOSTER`
- End placement: outcome (return-to-rescue / adopted-by-foster) → triggers Pet status transition back to `AVAILABLE` or `ADOPTED`
- Active-placement badge surfaced on Pet detail/edit modal
- Backed by `FosterPlacement` + `FosterPlacementTransition` backend models (see backend PRD §11)
- RBAC: `rescue_staff` for own rescue

## Technical Requirements

### Performance

- Dashboard load < 2s target
- Search < 500ms target
- Image bulk upload with per-file progress

### Security

- Role-based access via `PermissionsContext` (client-side fallback maps over server `rescue_staff` role)
- Audit logging via backend `auditLog.service.ts`
- Field-level permission overrides via backend `FieldPermission` model

### Mobile / PWA

- Mobile-first responsive design
- Mobile-specific Communication view
- **PWA enabled** via `vite-plugin-pwa`:
  - `registerType: 'autoUpdate'`
  - Workbox runtime caches: pet list, application list (NetworkFirst, short TTL)
  - Manifest + icons (192/512)
  - Install prompt component

*Out of scope:* Offline pet/application editing (sync-on-reconnect is complex; roadmap).

### Data Export / Import

- CSV + PDF export from analytics
- Pet CSV import via `PetCsvImportModal`

*Out of scope / roadmap:* Excel export, webhooks for third-party integrations.

## User Roles & Permissions

### Server-side role

- `rescue_staff` — only role enforced server-side for rescue access

### Client-side permission tiers (via `PermissionsContext`)

- **`rescue_admin`** (permission key): full rescue configuration, staff management, analytics, reports
- **`rescue_staff`** (permission key): pet management, application review, communication, basic reporting
- **`rescue_volunteer`** (permission key): read-mostly access to assigned scopes

*Removed from PRD:* `Rescue Manager` and `Volunteer` as distinct `UserRole` enum values (do not exist in backend).

## Data Models

### Core Models

```typescript
interface RescueAttributes {
  rescue_id: string;
  rescue_name: string;
  rescue_type: string;
  reference_number: string;
  verified: boolean;
  address: AddressInfo;
  location: GeoLocation;
}

interface StaffMemberAttributes {
  staff_member_id: string;
  user_id: string;
  rescue_id: string;
  verified_by_rescue: boolean;
  title?: string;
}

interface ApplicationAttributes {
  application_id: string;
  user_id: string;
  pet_id: string;
  rescue_id: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'; // backend column
  answers: Record<string, unknown>;
  // Side-effect models (drive UI stage derivation):
  // HomeVisit (scheduled_at, completed_at, outcome)
  // ApplicationReference (status per reference)
}

interface FosterPlacementAttributes {
  placement_id: string;
  pet_id: string;
  foster_user_id: string;
  rescue_id: string;
  start_date: Date;
  end_date?: Date;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
}
```

## API Dependencies

- Pet Management: `petManagementService` (`lib.pets`)
- Applications: `applicationService` (+ `useApplications`)
- Communication: `lib.chat` `chatService`
- Notifications: `notificationsService` (`lib.notifications`)
- Staff: `staffService`
- Invitations: `invitationService` (`lib.invitations`)
- Analytics: `analyticsService` + `lib.analytics`
- Events: `eventsService`
- Rescue config: `rescueService`
- Permissions: `permissionsService` (`lib.permissions`)
- Foster: `/api/v1/foster/placements` (new)

*Out of scope:* Calendar/payment/social/vet third-party integrations.

## Success Metrics

### Operational Efficiency

- 50% reduction in application processing time
- Response time average under 24 hours
- 95%+ pet profile completion

### Adoption Success

- 85%+ adoption rate for healthy pets
- 25% reduction in average time-to-adoption
- Under 5% return rate

### User Engagement

- 90%+ staff actively using platform
- 60%+ mobile usage

## Risk Mitigation

### Operational

- Data loss: backend automated backups + retention worker
- Staff turnover: invitations + documented onboarding
- Downtime: backend HA + health probes

### Data Security

- Encryption of sensitive backend data (2FA secrets today; broader PII roadmap)
- GDPR-compliant retention/export/deletion via backend privacy routes
- Field-level permissions via `lib.permissions`

## Future Roadmap

### Near Term

- Public rescue profile editor
- Message templates library
- Internal staff chat
- Excel export
- Medical/vaccination/behavioural-assessment dedicated UIs

### Medium Term

- External calendar integration (Google/iCal)
- Webhook delivery for third-party integrations
- Per-rescue financial reporting (if monetization lands)
- Application status model extension (add `CONDITIONAL` final outcome)

### Deferred / De-scoped

- AI matching (cross-app; see client recommendations plan)
- Veterinary system integration
- Transport network integration
- IoT smart-collar integration
- Blockchain health records
- VR pet interaction

## Additional Resources

- **Implementation Plan**: [implementation-plan.md](./implementation-plan.md)
- **Technical Architecture**: [technical-architecture.md](./technical-architecture.md)
- **Backend PRD (foster + status model)**: [../backend/service-backend-prd.md](../backend/service-backend-prd.md)
- **API Documentation**: [../backend/api-endpoints.md](../backend/api-endpoints.md)
