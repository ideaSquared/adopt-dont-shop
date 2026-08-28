# API route audit — findings & roadmap

A codebase-wide cross-reference of every frontend REST call (apps/_ +
packages/lib._) against every gateway route. 301 gateway routes vs 342
distinct frontend call sites; **88 genuine mismatches** were found — far
more than the four that showed up in the gateway logs.

**Status:** this PR fixes the CSRF login bug plus every mismatch that
could be resolved without a product decision — the gateway-route bugs
(section 0), the ~15 frontend path/method repoints whose backing RPC
already existed (section 0b), and 5 clean CRUD-gap RPCs (section 0c). The
remaining ~36 calls (section 2) target features that were never built on
the backend and each need a design/product decision, so they are left as
a prioritized backlog rather than fabricated.

## Re-triage — ADS-1248 (2026-08)

> **The numbered sections below are the ORIGINAL PR #1393 snapshot and are now
> largely stale.** Re-verifying every finding against the current code (ADS-1248)
> shows most were resolved after #1393 — chiefly by the
> `frontend-backend-alignment` wave **ADS-1183 … ADS-1204** (all Done) and by the
> gateway growing compatibility routes. Current status by section:
>
> - **§0 / §0b / §0c** — fixed in #1393, as described.
> - **§1 (30 path/method repoints)** — re-verified call-by-call: **all resolved
>   except two**, both fixed in the ADS-1248 change —
>   `support-ticket-service.addResponse` (`/tickets/:id/reply` →
>   `/tickets/:id/responses`) and the app.rescue demo helper in
>   `PetManagement.tsx` (`PATCH` → `PUT /api/v1/users/:id`). The rest were
>   repointed by the ADS-118x wave or are served by new gateway compat routes
>   (e.g. `/notifications/mark-read`, `/notifications/user/:id`,
>   `/notifications/preferences/:id`).
> - **§2 (no backing)** — substantially addressed by the ADS-118x wave (e.g.
>   account deletion → ADS-1185, reference checks → ADS-1199, quick-application
>   → ADS-1203) and by §2a (the analytics surface has no honest minimal-viable
>   endpoint — dead calls or real subsystems). The genuinely-unbuilt remainder
>   (the legal/consent store, application timeline, analytics exports, report
>   shares/schedules) stays **deferred product work**; the frontend already
>   fails these gracefully, so nothing regresses.
> - **§3 (silent mis-routes)** — the gateway added specific, correctly-ordered
>   routes for `/pets/breeds[/:type]`, `/notifications/templates/:id/process`
>   and `/chats/analytics`, and `/applications/statistics` → `/stats` was fixed
>   (ADS-1204). The residual paths (`/pets/types`, `/pets/recent`,
>   `/pets/statistics`, `/notifications/stats`) are reached only by **dead
>   service methods** — no live component calls them (the pet-type filter uses a
>   static list in `apps/client/src/pages/searchOptions.ts`, not the API).
>   Recommended follow-up: delete the dead `getPetTypes` / `getRecentPets` /
>   `getPetStatistics` (`lib.pets`) and `getStats` (`lib.notifications`) methods
>   plus their endpoint constants (verify no dynamic caller first).
>
> **Net:** ADS-1248's actionable, decision-free residual was the two §1 repoints
> above (now fixed). Everything else is either already resolved or deferred
> product/feature work.

## 0. Fixed in this PR — gateway-route bugs

| Area                                          | Change                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSRF login 403s**                           | The gateway minted a _fresh_ token on every `GET /api/v1/csrf-token`, clobbering the one host-scoped `csrfToken` cookie shared by every `ApiService` instance across apps/tabs. A second handshake rotated the cookie out from under a cached header → `cookie ≠ header` → 403 on login. Fix: reuse the existing cookie server-side (stable nonce) + read the live cookie client-side so the header can never diverge. |
| `POST /api/v1/rescues/:rescueId/staff`        | Wire the existing `RescueService.CreateStaffMember` RPC (client method + route).                                                                                                                                                                                                                                                                                                                                       |
| `PUT /api/v1/rescues/:rescueId/staff/:userId` | Wire the existing `RescueService.UpdateStaffMember` RPC.                                                                                                                                                                                                                                                                                                                                                               |
| `PATCH /api/v1/admin/users/:userId`           | Add the plain profile-update route (only the `/action` moderation variant existed) → `AuthService.AdminUpdateUser`.                                                                                                                                                                                                                                                                                                    |
| `GET /api/v1/admin/moderation/metrics`        | New `ModerationService.GetModerationMetrics` aggregation RPC (SQL over reports + moderator_actions) + gateway route. Restores the admin Moderation dashboard stat cards.                                                                                                                                                                                                                                               |
| `GET /api/v1/email/provider-info`             | Small gateway-folded dev route so lib.dev-tools' Ethereal widget stops 404-ing.                                                                                                                                                                                                                                                                                                                                        |

## 0b. Fixed in this PR — frontend repoints (backing RPC existed elsewhere)

Repointed to the correct existing gateway path/method (with tests):
notifications mark-all-read / preferences read / template preview /
unread-count; pets by-rescue + updatePet (PUT→PATCH) + updatePetStatus
(PATCH→POST); chat message reactions (flat path); discovery swipe
session start/end → matching sessions; permissions assignRole + health;
lib.api healthCheck → /health/simple; rescue scheduleHomeVisit → singular
path. Repoints whose target contract was genuinely incompatible (e.g.
bulk-by-ids mark-read, cursor-vs-page notification list, nested
preference writes, admin support reply/my-tickets, audit-logs,
custom-reports) were left unchanged and folded into section 2.

## 0c. Fixed in this PR — new CRUD-gap RPCs

Well-specified endpoints whose entity already existed but had no RPC —
added end-to-end (proto → handler → gateway route → tests):

| Endpoint                                             | New RPC                              |
| ---------------------------------------------------- | ------------------------------------ |
| `POST /api/v1/admin/moderation/reports/:id/escalate` | `moderation.EscalateReport`          |
| `PUT /api/v1/rescues/:id/questions/:qid`             | `rescue.UpdateApplicationQuestion`   |
| `PATCH /api/v1/rescues/:id/questions/reorder`        | `rescue.ReorderApplicationQuestions` |
| `DELETE /api/v1/reports/schedules/:id`               | `audit.DeleteReportSchedule`         |
| `DELETE /api/v1/reports/shares/:id`                  | `audit.RevokeReportShare`            |

## 1. Backing RPC exists elsewhere — needs a path/method repoint (or gateway alias)

These frontend calls hit a path/method the gateway doesn't serve, but the
underlying RPC IS already exposed at a different gateway path. The fix is
a one-line change in the frontend service (or a thin gateway alias) — no
new backend capability. **30 calls.**

| Call                                                                     | Caller                                                           | Fix                                                                                                                                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/health`                                                     | packages/lib.api/src/services/api-service.ts                     | Gateway exposes /health/simple and /health/ready, not /api/v1/health. Point frontend healthCheck at /health/simple or add an /api/v1/health alias.                         |
| `GET /api/v1/pets/rescue/${rescueId}`                                    | packages/lib.pets/src/services/pets-service.ts                   | No /pets/rescue/:rescueId route (3-seg). pets.List supports rescue filtering; use GET /api/v1/pets?rescueId=... .                                                          |
| `GET /api/v1/pets/rescue/my`                                             | packages/lib.pets/src/services/pets-management-service.ts        | No /pets/rescue/my route. Back with pets.List scoped to caller's rescue via GET /api/v1/pets.                                                                              |
| `PUT /api/v1/pets/${petId}`                                              | packages/lib.pets/src/services/pets-management-service.ts        | Method mismatch: gateway exposes PATCH /api/v1/pets/:id (pets.Update). Change updatePet to PATCH.                                                                          |
| `PATCH /api/v1/pets/${petId}/status`                                     | packages/lib.pets/src/services/pets-management-service.ts        | Method mismatch: gateway exposes POST /api/v1/pets/:id/status (pets.UpdateStatus). Change updatePetStatus to POST.                                                         |
| `GET /api/v1/notifications/user/${userId}`                               | packages/lib.notifications/src/services/notifications-service.ts | Legacy per-user path. Gateway is principal-scoped GET /api/v1/notifications (notifications.List). Repoint client.                                                          |
| `PATCH /api/v1/notifications/mark-read`                                  | packages/lib.notifications/src/services/notifications-service.ts | Gateway exposes PATCH /api/v1/notifications/:id/read. Repoint markAsRead to the per-id route.                                                                              |
| `PATCH /api/v1/notifications/user/${userId}/mark-all-read`               | packages/lib.notifications/src/services/notifications-service.ts | Gateway exposes POST /api/v1/notifications/read-all (notifications.MarkAllRead). Repoint client.                                                                           |
| `GET /api/v1/notifications/preferences/${userId}`                        | packages/lib.notifications/src/services/notifications-service.ts | Gateway is principal-scoped GET /api/v1/notifications/preferences (GetNotificationPreferences). Drop the /:userId segment.                                                 |
| `PATCH /api/v1/notifications/preferences/${userId}`                      | packages/lib.notifications/src/services/notifications-service.ts | Gateway is PUT /api/v1/notifications/preferences (UpdateNotificationPreferences). Fix method+path.                                                                         |
| `POST /api/v1/notifications/templates/${templateId}/preview`             | packages/lib.notifications/src/services/notifications-service.ts | Gateway exposes POST /api/v1/email/templates/:templateId/preview (PreviewEmailTemplate). Repoint client to /email/templates path.                                          |
| `GET /api/v1/notifications/user/${userId}/unread-count`                  | packages/lib.notifications/src/services/notifications-service.ts | Gateway is GET /api/v1/notifications/unread/count (GetUnreadCount). Repoint client.                                                                                        |
| `POST /api/v1/discovery/swipe/session/start`                             | packages/lib.discovery/src/services/discovery-service.ts         | Gateway exposes POST /api/v1/matching/sessions (matching.StartSession). Repoint or add discovery alias.                                                                    |
| `POST /api/v1/discovery/swipe/session/end`                               | packages/lib.discovery/src/services/discovery-service.ts         | Gateway exposes POST /api/v1/matching/sessions/:id/end (matching.EndSession). Repoint client.                                                                              |
| `GET /api/v1/admin/support/my-tickets`                                   | packages/lib.support-tickets/src/support-ticket-service.ts       | No admin/support/my-tickets route (a non-admin GET /api/v1/support/my-tickets exists, backed by ListSupportTickets). Repoint client or add admin route.                    |
| `POST /api/v1/admin/support/tickets/${ticketId}/reply`                   | packages/lib.support-tickets/src/support-ticket-service.ts       | Gateway route is POST /api/v1/admin/support/tickets/:id/responses (RespondToTicket). Client uses /reply; repoint to /responses.                                            |
| `GET /api/v1/admin/audit-logs`                                           | packages/lib.audit-logs/src/services/audit-logs-service.ts       | Gateway exposes GET /api/v1/audit (audit.Query). Repoint getAuditLogs to /api/v1/audit.                                                                                    |
| `POST /api/v1/users/assign-role`                                         | packages/lib.permissions/src/services/permissions-service.ts     | auth.AssignRole is exposed as POST /api/v1/auth/assign-role and PUT /api/v1/users/:userId/role. Repoint client to one of those.                                            |
| `GET /api/v1/permissions/audit-logs`                                     | packages/lib.permissions/src/services/permissions-service.ts     | No /permissions/audit-logs route; audit.Query (GET /api/v1/audit) covers audit reads. Repoint or add filtered route.                                                       |
| `GET /api/v1/permissions/health`                                         | packages/lib.permissions/src/services/permissions-service.ts     | No such route; use gateway /health/ready. Likely dead code.                                                                                                                |
| `POST /api/v1/analytics/reports/generate`                                | packages/lib.analytics/src/services/analytics-service.ts         | No /analytics/reports/generate route; the /api/v1/reports surface (audit report RPCs) covers report execution. Repoint or add route.                                       |
| `POST /api/v1/analytics/custom-reports`                                  | apps/rescue/src/services/analyticsService.ts                     | No /analytics/custom-reports route; audit.CreateSavedReport is exposed under POST /api/v1/reports. Repoint or add route.                                                   |
| `GET /api/v1/analytics/custom-reports`                                   | apps/rescue/src/services/analyticsService.ts                     | No route; audit.ListSavedReports is exposed under GET /api/v1/reports. Repoint or add route.                                                                               |
| `DELETE /api/v1/analytics/custom-reports/${reportId}`                    | apps/rescue/src/services/analyticsService.ts                     | No route; audit.DeleteSavedReport is exposed under DELETE /api/v1/reports/:id. Repoint or add route.                                                                       |
| `POST /api/v1/chats/${conversationId}/attachments`                       | packages/lib.chat/src/services/chat-service.ts                   | No chat attachments route; attachments go via /api/v1/uploads/images then chat.SendMessage. Repoint client or add route.                                                   |
| `POST /api/v1/chats/${conversationId}/messages/${messageId}/reactions`   | packages/lib.chat/src/services/chat-service.ts                   | chat.React is exposed as POST /api/v1/messages/:messageId/reactions. Repoint client to that flat path.                                                                     |
| `DELETE /api/v1/chats/${conversationId}/messages/${messageId}/reactions` | packages/lib.chat/src/services/chat-service.ts                   | No DELETE reactions route; chat.React (toggle) is only wired to POST /api/v1/messages/:messageId/reactions. Repoint or add DELETE route.                                   |
| `PATCH /api/v1/users/${userId}`                                          | apps/rescue/src/pages/PetManagement.tsx                          | Method mismatch: gateway exposes PUT /api/v1/users/:userId (AdminUpdateUser). This demo helper should use PUT.                                                             |
| `POST /api/v1/applications/${applicationId}/home-visits`                 | apps/rescue/src/services/applicationService.ts                   | applications.ScheduleHomeVisit is exposed as POST /api/v1/applications/:id/home-visit/schedule (singular). Repoint client to that path.                                    |
| `PUT /api/v1/applications/${applicationId}/home-visits/${visitId}`       | apps/rescue/src/services/applicationService.ts                   | applications.CompleteHomeVisit is exposed as POST /api/v1/applications/:id/home-visit/complete; there is no per-visit PUT/update. Repoint or add an update-home-visit RPC. |

## 2. No backing at all — needs a new RPC / feature (product work)

These frontend methods call endpoints that were never built on the
backend (whole unimplemented features: consent/legal re-acceptance,
application timeline, quick-application, analytics funnels/exports,
report shares/schedules deletion, chat status, etc.). Each needs a new
service RPC (often a migration) and, in several cases, a product
decision. **54 calls.** Notable: the legal
re-acceptance trio (`GET /api/v1/legal/pending-reacceptance`,
`POST /api/v1/privacy/consent`, `POST /api/v1/privacy/cookies-consent`)
is an entire consent-store feature — deferred deliberately rather than
half-built, since it's legally load-bearing. The frontend already fails
these silently today, so nothing regresses by deferring.

| Call                                                         | Caller                                                           | Fix                                                                                                                                                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DELETE /api/v1/users/account`                               | packages/lib.auth/src/services/auth-service.ts                   | No DELETE /api/v1/users/account route exists (only GET+PATCH). auth.RequestAccountDeletion RPC exists; add the route or point deleteAccount at the privacy delete-request flow.      |
| `GET /api/v1/pets/breeds/${type}`                            | packages/lib.pets/src/services/pets-service.ts                   | No breeds RPC/route. Note the 2-seg /api/v1/pets/breeds silently matches GET /api/v1/pets/:id (breeds treated as id). Needs a new breeds data source or removal.                     |
| `GET /api/v1/pets/${petId}/similar`                          | packages/lib.pets/src/services/pets-service.ts                   | No similar-pets RPC (matching service has no such method). Needs a new RPC/route or remove the call.                                                                                 |
| `POST /api/v1/pets/${petId}/report`                          | packages/lib.pets/src/services/pets-service.ts                   | No pets report route. moderation.FileReport exists; route the pet report to moderation or add a gateway route.                                                                       |
| `POST /api/v1/pets/${petId}/images`                          | packages/lib.pets/src/services/pets-management-service.ts        | No pets images route. Image URLs are set via pets.Update after /api/v1/uploads/images; add a route or change client to upload+Update.                                                |
| `DELETE /api/v1/pets/${petId}/images`                        | packages/lib.pets/src/services/pets-management-service.ts        | No pets images route. Image removal must go through pets.Update image_urls; add route or change client.                                                                              |
| `POST /api/v1/notifications/bulk`                            | packages/lib.notifications/src/services/notifications-service.ts | No bulk route. notifications has Broadcast and Create (loop); either use Broadcast or add a bulk route.                                                                              |
| `POST /api/v1/notifications/schedule`                        | packages/lib.notifications/src/services/notifications-service.ts | No schedule RPC/route. Needs a new capability or remove.                                                                                                                             |
| `PATCH /api/v1/notifications/preferences/${userId}/dnd`      | packages/lib.notifications/src/services/notifications-service.ts | No DND route; would fold into UpdateNotificationPreferences via PUT /api/v1/notifications/preferences.                                                                               |
| `POST /api/v1/notifications/templates/${templateId}/process` | packages/lib.notifications/src/services/notifications-service.ts | No template-process route. PreviewEmailTemplate is the closest RPC; add a route or change client.                                                                                    |
| `GET /api/v1/search/messages`                                | packages/lib.search/src/services/search-service.ts               | No message-search route. chat.SearchChats searches chats not messages; needs an RPC/route or remove.                                                                                 |
| `GET /api/v1/search/suggestions`                             | packages/lib.search/src/services/search-service.ts               | No suggestions RPC/route. Needs new capability or remove.                                                                                                                            |
| `POST /api/v1/search/faceted`                                | packages/lib.search/src/services/search-service.ts               | No faceted route. matching.SearchPets (GET /api/v1/search/pets) is the nearest; add faceted route or fold in.                                                                        |
| `POST /api/v1/admin/moderation/reports/${reportId}/escalate` | packages/lib.moderation/src/moderation-service.ts                | No Escalate RPC (proto has escalated_to field but no rpc/route). Add an EscalateReport RPC + route or drop the call.                                                                 |
| `GET /api/v1/admin/moderation/actions/active`                | packages/lib.moderation/src/moderation-service.ts                | No /actions/active route. ListModeratorActions exists; add route with an active filter or use GET /admin/moderation/actions with a query.                                            |
| `GET /api/v1/admin/support/stats`                            | packages/lib.support-tickets/src/support-ticket-service.ts       | No support-stats RPC/route. Needs new aggregation or remove.                                                                                                                         |
| `PATCH /api/v1/admin/support/tickets/${ticketId}`            | packages/lib.support-tickets/src/support-ticket-service.ts       | No PATCH ticket route/RPC (only AssignSupportTicket, RespondToTicket). Add an UpdateSupportTicket RPC or use the assign/respond routes.                                              |
| `POST /api/v1/admin/support/tickets/${ticketId}/escalate`    | packages/lib.support-tickets/src/support-ticket-service.ts       | No escalate RPC/route for support tickets. Add capability or remove.                                                                                                                 |
| `GET /api/v1/admin/support/tickets/${ticketId}/messages`     | packages/lib.support-tickets/src/support-ticket-service.ts       | No admin messages route (non-admin GET /api/v1/support/tickets/:id/messages exists; GetSupportTicket returns thread). Add admin route or repoint.                                    |
| `GET /api/v1/legal/pending-reacceptance`                     | packages/lib.legal/src/services/legal-service.ts                 | legal.ts explicitly documents this is intentionally NOT gateway-folded and needs an audit.GetConsentHistory RPC that does not yet exist. Add that RPC + route.                       |
| `POST /api/v1/privacy/consent`                               | packages/lib.legal/src/services/legal-service.ts                 | No /privacy/consent route. auth.UpdatePrivacyPreferences is closest; add a consent-recording route/RPC.                                                                              |
| `POST /api/v1/privacy/cookies-consent`                       | packages/lib.legal/src/services/legal-service.ts                 | No cookies-consent route/RPC. Add capability or remove.                                                                                                                              |
| `POST /api/v1/permissions/check`                             | packages/lib.permissions/src/services/permissions-service.ts     | No /permissions/check route. Permission checks derive from auth.GetUserPermissions client-side; add route or compute from /users/:id/permissions.                                    |
| `POST /api/v1/users/grant-permissions`                       | packages/lib.permissions/src/services/permissions-service.ts     | No grant-permissions RPC/route (auth uses role-based AssignRole). Add capability or remove.                                                                                          |
| `POST /api/v1/users/revoke-permissions`                      | packages/lib.permissions/src/services/permissions-service.ts     | No revoke-permissions RPC/route. Add capability or remove.                                                                                                                           |
| `GET /api/v1/permissions/list`                               | packages/lib.permissions/src/services/permissions-service.ts     | No permissions-list route/RPC (permission constants are static in lib.types). Serve statically or add route.                                                                         |
| `POST /api/v1/analytics/journeys`                            | packages/lib.analytics/src/services/analytics-service.ts         | No journeys route (gateway analytics.ts handles pageviews/events/events-batch). Fold into /analytics/events or add route.                                                            |
| `GET /api/v1/analytics/engagement`                           | packages/lib.analytics/src/services/analytics-service.ts         | No engagement metrics route/RPC. Needs new aggregation or remove.                                                                                                                    |
| `GET /api/v1/analytics/performance`                          | packages/lib.analytics/src/services/analytics-service.ts         | No performance route/RPC. Needs new capability or remove.                                                                                                                            |
| `GET /api/v1/analytics/funnels`                              | packages/lib.analytics/src/services/analytics-service.ts         | No funnels route/RPC. Needs new capability or remove.                                                                                                                                |
| `GET /api/v1/analytics/ab-tests/${testId}`                   | packages/lib.analytics/src/services/analytics-service.ts         | No ab-tests route/RPC. Needs new capability or remove.                                                                                                                               |
| `GET /api/v1/analytics/response-time`                        | apps/rescue/src/services/analyticsService.ts                     | No response-time route (gateway analytics-metrics.ts has adoption-metrics/application-analytics/pet-performance/stage-distribution only). Add metric or remove.                      |
| `POST /api/v1/analytics/export/csv`                          | apps/rescue/src/services/analyticsService.ts                     | No export/csv route/RPC. Needs new capability or remove.                                                                                                                             |
| `POST /api/v1/analytics/export/pdf`                          | apps/rescue/src/services/analyticsService.ts                     | No export/pdf route/RPC. Needs new capability or remove.                                                                                                                             |
| `POST /api/v1/analytics/email-report`                        | apps/rescue/src/services/analyticsService.ts                     | No email-report route/RPC. Needs new capability or remove.                                                                                                                           |
| `DELETE /api/v1/reports/schedules/${scheduleId}`             | packages/lib.analytics/src/services/report-service.ts            | No delete-schedule route; audit has UpsertReportSchedule but no delete-schedule RPC. Add RPC + route.                                                                                |
| `DELETE /api/v1/reports/shares/${shareId}`                   | packages/lib.analytics/src/services/report-service.ts            | No revoke-share route; audit has CreateReportShare but no revoke RPC. Add RPC + route.                                                                                               |
| `GET /api/v1/reports/shared/${token}`                        | packages/lib.analytics/src/services/report-service.ts            | No public shared-report-by-token route/RPC. Add a GetReportShareByToken RPC + route.                                                                                                 |
| `PATCH /api/v1/chats/${chatId}`                              | packages/lib.chat/src/services/admin-chat-hooks.ts               | No PATCH chat route and no UpdateChat/status RPC in chat proto (OpenChat/GetChat/DeleteChat only). Add an UpdateChatStatus RPC + route or drop status updates.                       |
| `GET /api/v1/cms/slug`                                       | apps/admin/src/services/cmsService.ts                            | No slug-generation route/RPC in cms proto. Generate slugs client-side or add an RPC.                                                                                                 |
| `DELETE /api/v1/rescues/${rescueId}`                         | apps/admin/src/services/rescueService.ts                         | No DELETE rescue route and no Delete RPC in rescue proto. Add a DeleteRescue (or soft-delete/reject) RPC + route, or use reject.                                                     |
| `PUT /api/v1/rescues/${rescueId}/questions/${questionId}`    | apps/rescue/src/components/rescue/QuestionsBuilder.tsx           | rescue proto has List/Create/Delete ApplicationQuestion but NO UpdateApplicationQuestion. Add that RPC + PUT route (edit/toggle-enabled depend on it).                               |
| `PATCH /api/v1/rescues/${rescueId}/questions/reorder`        | apps/rescue/src/components/rescue/QuestionsBuilder.tsx           | No reorder RPC/route for application questions. Add a ReorderApplicationQuestions RPC + PATCH route.                                                                                 |
| `GET /api/v1/profile/application-preferences`                | apps/client/src/services/applicationProfileService.ts            | Only application-defaults is wired (GetApplicationDefaults). No application-preferences RPC/route. Add RPC + route or remove.                                                        |
| `PUT /api/v1/profile/application-preferences`                | apps/client/src/services/applicationProfileService.ts            | No application-preferences write RPC/route. Add RPC + route or remove.                                                                                                               |
| `GET /api/v1/profile/completion`                             | apps/client/src/services/applicationProfileService.ts            | No profile-completion RPC/route. Add capability or remove.                                                                                                                           |
| `GET /api/v1/profile/pre-population`                         | apps/client/src/services/applicationProfileService.ts            | No pre-population RPC/route. Add capability or remove.                                                                                                                               |
| `POST /api/v1/profile/quick-application`                     | apps/client/src/services/applicationProfileService.ts            | No quick-application RPC/route. Add capability or remove.                                                                                                                            |
| `PATCH /api/v1/applications/${applicationId}/references`     | apps/rescue/src/services/applicationService.ts                   | No reference-check RPC/route in applications proto. Add capability or remove.                                                                                                        |
| `GET /api/v1/applications/${applicationId}/home-visits`      | apps/rescue/src/services/applicationService.ts                   | applications has ScheduleHomeVisit/CompleteHomeVisit (writes) but no list-home-visits RPC/route (gateway only exposes singular home-visit/schedule & /complete). Add a list RPC +... |
| `GET /api/v1/applications/${applicationId}/timeline`         | apps/rescue/src/services/applicationService.ts                   | No timeline RPC/route. Add a GetApplicationTimeline RPC + route or remove (audit entity-activity is the closest existing surface).                                                   |
| `POST /api/v1/applications/${applicationId}/timeline/events` | apps/rescue/src/services/applicationService.ts                   | No timeline-event RPC/route. Add capability or remove.                                                                                                                               |
| `GET /api/v1/applications/${applicationId}/timeline/stats`   | apps/rescue/src/services/applicationService.ts                   | No timeline-stats RPC/route. Add capability or remove.                                                                                                                               |
| `POST /api/v1/applications/${applicationId}/timeline/notes`  | apps/rescue/src/services/applicationService.ts                   | No timeline-notes RPC/route. Add capability or remove.                                                                                                                               |

## 2a. Analytics platform (ADS-1138) — scoping resolution

Investigated the whole `/api/v1/analytics/*` surface for the route-audit
follow-up. Conclusion: **no honest minimal-viable endpoint to build here** —
every unbacked call is either dead frontend code or needs a real subsystem,
so building now would mean plumbing for code no UI renders, or fabricating
data. The one live consumer (`apps/rescue/src/pages/Analytics.tsx`) fetches
via `Promise.allSettled`, so an unbacked call degrades gracefully (the card
shows 0 / empty) rather than breaking the page.

**Dead frontend code — no live UI imports these (delete or leave unbacked):**

- `GET|POST|DELETE /api/v1/analytics/custom-reports[/:id]`
  (`apps/rescue` `analyticsService.{get,save,delete}CustomReport`) — no
  component calls them. The working saved-report surface is
  `/api/v1/reports` (audit), already consumed by
  `lib.analytics/report-service.ts`. If the custom-report UI is revived,
  repoint it there rather than aliasing `/analytics/custom-reports`.
- `POST /api/v1/analytics/reports/generate`, `/journeys`,
  `GET /api/v1/analytics/engagement`, `/performance`, `/funnels`,
  `/ab-tests/:id` (`lib.analytics/analytics-service.ts`) — no live caller.
  Report execution already exists at `POST /api/v1/reports/execute`.

**Live but needs a real subsystem (a data model / renderer / mailer — not
minimal-viable, not to be stubbed with fake data):**

- `GET /api/v1/analytics/response-time` — per-staff first-response times +
  SLA compliance. No response-time / staff-assignment tracking exists.
- `POST /api/v1/analytics/export/csv`, `/export/pdf` — file renderers over
  the composed metrics.
- `POST /api/v1/analytics/email-report` — scheduled render + mail send.

The already-backed rescue metrics (`adoption-metrics`,
`application-analytics`, `pet-performance`, `stage-distribution`) are served
by `routes/analytics-metrics.ts` and are unaffected.

## 3. Suspicious silent matches (mis-routing, not 404s)

(NOT counted as gaps — they DO match a route pattern but almost certainly mis-route): GET /api/v1/pets/featured, /pets/recent, /pets/types, /pets/statistics, /pets/breeds all collapse onto GET /api/v1/pets/:id (literal treated as pet id); GET /api/v1/notifications/templates and /notifications/stats collapse onto GET /api/v1/notifications/:id; GET /api/v1/chats/analytics collapses onto GET /api/v1/chats/:chatId; GET /api/v1/applications/statistics collapses onto GET /api/v1/applications/:id (the real stats route is /api/v1/applications/stats). These will hit the wrong handler and typically return NOT_FOUND rather than a clean 404 — worth fixing even though they technically match.
