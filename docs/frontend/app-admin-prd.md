# Product Requirements Document: Admin App (app.admin)

## Overview

The Admin App is a comprehensive administrative dashboard for platform administrators, moderators, and support agents to manage the entire Adopt Don't Shop ecosystem. It provides tools for user management, rescue oversight, content moderation, analytics, and platform configuration.

## Target Users

- **Primary**: Platform administrators (super_admin, admin)
- **Secondary**: Content moderators (moderator)
- **Tertiary**: Customer support representatives (support_agent — read-only on most surfaces)

## Key Features

### 1. User Management

- **User Directory**: Complete user database with search and filtering
- **User Profiles**: Detailed user information and account status (`UserDetailModal`)
- **Add User**: Create new users via `AddUserModal` (admin-initiated)
- **Role Management**: Assign and modify user roles. Active roles: `adopter | rescue_staff | admin | moderator | super_admin | support_agent`
- **Account Actions**: Enable/disable accounts, suspend/unsuspend, password reset
- **User Activity Tab**: Per-user activity log surfaced via `UserDetailModal`
- **Bulk Operations**: Mass activate/deactivate/delete with export to CSV
- **User Analytics**: Registration trends in Dashboard + Analytics pages

*Out of scope / roadmap:* CSV import, account merging.

### 2. Rescue Organization Management

- **Rescue Directory**: Searchable, filterable
- **Verification System**: Approve and verify rescue organizations via `RescueVerificationModal`
- **Profile Management**: Edit rescue profiles via `RescueDetailModal` (tabs: Overview / Contact / Listings / Plan / Policies / Staff / Foster)
- **Performance Metrics**: Adoption counts + avg time-to-adoption ranking
- **Communication**: Templated email to rescue contact via `SendEmailModal`

### 3. Platform Analytics & Reporting

- **Dashboard Overview**: Platform metric cards (`usePlatformMetrics`)
- **User Analytics**: Registration trend chart on Analytics page
- **Adoption Analytics**: Success rates, time-to-adoption, trends
- **Custom Reports**: Full report builder framework wired to backend (`useReports`, `useReportTemplates`, `useSaveReport`, `useExecuteSavedReport`, `useUpsertSchedule`, `useCreateTokenShare`)
- **Data Export**: CSV + PDF via in-browser `exportService.ts`

*Out of scope / roadmap:* Real-time KPI streaming, server-rendered large-dataset exports (100k+), system uptime/performance UI (lives in Prometheus/Grafana stacks).

### 4. Content Management

- **Static Content**: Pages, terms, policies (`ContentManagement.tsx` + `cmsService.ts` — full CRUD, publish/unpublish, archive, versioning, scheduling)
- **Blog Management**: `contentType: 'blog_post'`
- **Help Documentation**: `contentType: 'help_article'`
- **Navigation Menus**: Menu CRUD via cmsService
- **Broadcast Notifications**: Platform-wide messaging via `BroadcastNotifications.tsx`

*Removed from PRD:* Media library (no consumers; CMS uses direct image URLs). Email template CRUD (only hardcoded `SendEmailModal` templates currently — moved to roadmap).

### 5. System Configuration

- **Feature Flags**: **Read-only display** of Statsig gates with link to Statsig console. Backend feature-flag system was removed; Statsig is single source of truth. See `lib.feature-flags/src/index.ts:13`. Toggling happens in Statsig console, not in-app.
- **System Settings**: Read-only display of platform configuration
- **Application Questions**: Question library lives per-rescue in `app.rescue` (cross-app concern; not duplicated in admin)
- **Security Settings**: Full Security Center (`SecurityCenter.tsx`) covering MFA, sessions, IP rules, login history, suspicious activity, account recovery
- **Field-Level Permissions**: Full override grid via `FieldPermissions.tsx`

*Out of scope / roadmap:* In-app feature toggle (delegated to Statsig), maintenance-mode toggle, API key issuance UI.

### 6. Pet & Application Management

- **Pet Oversight**: List, filter, archived toggle, status badges, bulk publish/unpublish/archive
- **Pet Detail Modal**: Row-click opens `PetDetailModal` (tabs: Overview / Rescue / Status history / Media / Reports)
- **Application Monitoring**: List, filter, bulk approve/reject with reason
- **Application Detail Modal**: Row-click opens `ApplicationDetailModal` with read-only view + admin override actions (force-status-change, audit-log link)
- **Quality Control**: Reports flow via Moderation page
- **Bulk Operations**: Mass updates wired to backend

*Out of scope / roadmap:* Duplicate detection/merge, dedicated data-integrity tooling.

### 7. Communication Systems

- **Message Monitoring**: `Messages.tsx` via `useAdminChats` from `lib.chat`
- **Conversation Management**: `ChatDetailModal` (tabs: Messages / Participants / Moderation / Details)
- **Broadcast Notifications**: Platform-wide announcements
- **Support Ticket System**: `Support.tsx` + `TicketDetailModal.tsx` via `lib.support-tickets`
- **Escalation**: `escalated` status filter + badge

*Out of scope / roadmap:* Email campaign workflow, response templates, knowledge base, per-agent performance tracking.

### 8. Content Moderation & Safety

- **Single Moderation page** (`/moderation`) with internal tabs for Queue, Reports, Sanctions
- **Content Reports**: Queue via `lib.moderation` (`useReports`)
- **Moderation Actions**: Resolve / dismiss / action via `ActionSelectionModal`
- **Sanctions Tab**: Apply warnings, restrictions, temporary bans (linked to moderation actions)
- **Safety Metrics**: Stat cards on Moderation page via `useModerationMetrics`

*Out of scope / roadmap:* Appeals UI, automated/AI screening, policy management UI, educational resources.

### 9. Support, Audit, GDPR

- **Ticket Management**: Full UI via `lib.support-tickets`
- **Audit Logs**: `Audit.tsx` via `AuditLogsService` from `lib.audit-logs`
- **Security Monitoring**: Failed-login + suspicious-activity tabs in Security Center
- **GDPR/Privacy Tools** (`PrivacyTools.tsx` — admin page): trigger user data export + deletion-request workflows against backend `/api/v1/privacy/*` endpoints (admin-scoped wrappers)
- **Account Settings** (admin's own): MFA, sessions, etc.

*Out of scope / roadmap:* Compliance reports UI, system health monitoring UI (Prometheus/Grafana lives outside the app).

## Technical Requirements

### Performance

- Dashboard load < 2s
- Search/filter < 1s
- Lazy-loaded routes (`App.tsx` uses lazy + Suspense)

### Security

- Role-based access control via `ProtectedRoute` + `requiredRole` prop (now enforced on role-sensitive routes)
- MFA available via `TwoFactorSettings` from `lib.auth` (enforcement for admin login is roadmap)
- Session management with revoke
- Audit logging for all admin actions
- IP restrictions CRUD
- Field-level permissions (admin overrides)

### Scalability

- Server-side pagination via DataTable
- Backend caching via Redis (transparent to admin app)

### Accessibility

- Theme toggle (`ThemeToggle` from `lib.components` — light/normal/dark)
- WCAG 2.1 AA targeted (no formal audit artefact)
- Keyboard navigation across DataTable + modals
- Screen-reader-friendly markup

## User Roles & Permissions

### Super Admin (`super_admin`)

- Full system access
- Manage all admin roles
- Bypasses `requiredRole` route gates
- Access all configuration, security, and audit surfaces

### Platform Admin (`admin`)

- User, rescue, content, support management
- View all analytics and reports
- Trigger GDPR exports/deletions

### Moderator (`moderator`)

- Content moderation queue, reports, sanctions
- Limited user actions (sanctions only)
- Read-only on most non-moderation surfaces

### Support Agent (`support_agent`)

- Ticket management
- Read-only user lookup
- Chat-log access for support context
- Knowledge-base maintenance (roadmap)
- Cannot modify roles, configuration, or moderation outcomes

### Rescue Staff (`rescue_staff`) — for reference

- Does not access app.admin. Belongs to `app.rescue`.

### Adopter (`adopter`) — for reference

- Does not access app.admin. Belongs to `app.client`.

*Removed from PRD:* `VERIFIED_USER`, `STAFF`, `Analytics Specialist`, `Content Moderator-as-distinct-userType` (now merged into `moderator`). Permission granularity lives in `lib.permissions` field-level permission system rather than separate `AdminUser` table.

## Data Models

Admin permissions are **field-level** via `lib.permissions` + `FieldPermission` model, not via a separate `AdminUser` table. The `User.userType` enum carries role identity.

For support/moderation models see backend PRD §5–§8.

## API Dependencies

- User Management: `userManagementService.ts` → `/api/v1/admin/users/*`
- Rescue Management: rescue endpoints + verification endpoints
- Analytics: report framework endpoints
- Audit Logs: `AuditLogsService`
- Field Permissions: `lib.permissions`
- Privacy/GDPR: `/api/v1/privacy/*` (admin-scoped wrappers)
- Chat moderation: `lib.chat` admin endpoints

## User Interface Requirements

### Dashboard

- Metric grid + recent-activity widgets
- Responsive (desktop-first; tablet supported)
- Quick actions sidebar (roadmap)

### Data Visualization

- Recharts-based components for analytics
- Interactive filtering on Analytics page
- Export to PNG/PDF via report framework

### Forms & Data Management

- DataTable with onRowClick, selection, server-side pagination
- Bulk operations toolbar pattern (see Pets, Applications, Users pages)
- Confirmation modals for destructive actions
- Modal-based editing (no inline editing)

### Theme

- High-contrast toggle (a11y)

*Out of scope / roadmap:* Light/dark theme switch, inline editing, auto-save.

## Workflow & User Journey

### Daily Admin Workflow

1. Dashboard review
2. New user / rescue verification queue
3. Content moderation queue
4. Support ticket queue
5. Audit log review

### Reporting Workflow

1. Open report builder
2. Select template or build from scratch
3. Save, schedule, or share via token

## Analytics & Monitoring

### Platform KPIs

- User growth
- Adoption success rates
- Platform usage
- Rescue performance
- Support ticket volume

*Out of scope:* Revenue tracking (no monetization), cost analysis, predictive analytics.

## Security & Compliance

### Data Protection

- GDPR Art. 17 + Art. 20 admin tools via `PrivacyTools.tsx`
- Consent records visible in `UserDetailModal`
- Field-level access restrictions enforced server-side

### Security Monitoring

- Failed login tracking via Security Center
- Permission change tracking via audit log
- API rate limiting + abuse detection at backend

### Audit Trail

- All admin mutations logged via `auditLog.service.ts` (immutable trigger at DB layer)

## Success Metrics

- 99.9% platform availability (backend SLO)
- Admin dashboard load < 2s p95
- < 0.1% error rate for admin mutations
- All admin actions auditable

## Future Roadmap

### Near Term

- Foster Coordination tab in `RescueDetailModal` (the full Foster page already lives in `app.rescue`)
- Email campaign workflow
- Maintenance-mode toggle
- MFA enforcement for admin login

### Medium Term

- Appeals UI for moderation
- AI-assisted content screening
- Email template CRUD (currently hardcoded list in `SendEmailModal`)
- Knowledge base for support agents
- Light/dark theme

### Deferred / De-scoped from earlier PRDs

- Media library (CMS uses direct URLs)
- Account merging
- Duplicate detection
- Financial / revenue reporting (no monetization model)
- Mobile admin app
- Public API for third-party integrations
- Autonomous/self-healing operations
