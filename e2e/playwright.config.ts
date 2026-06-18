import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export const URLS = {
  // Phase 11 follow-up: the monolith on :5000 is gone. The Fastify gateway
  // (services/gateway) is the single REST/WS edge and listens on :4000 in
  // docker-compose. Override with E2E_API_URL if a future deploy puts nginx
  // (`http://api.localhost`) or another reverse proxy in front.
  api: process.env.E2E_API_URL ?? 'http://localhost:4000',
  client: process.env.E2E_CLIENT_URL ?? 'http://localhost:3000',
  admin: process.env.E2E_ADMIN_URL ?? 'http://localhost:3001',
  rescue: process.env.E2E_RESCUE_URL ?? 'http://localhost:3002',
} as const;

export const AUTH_FILES = {
  adopter: '.auth/adopter.json',
  rescue: '.auth/rescue.json',
  admin: '.auth/admin.json',
} as const;

// Phase 11 follow-up — incremental un-park. #1076 aligned the gateway↔SPA
// auth contract (Bearer tokens, /me envelope, enum casing), so the UI login
// path produces a real session again and global-setup can snapshot
// storageState per role. We now un-park the legacy app-driven specs ONE
// journey at a time, validating each in CI (the `run-e2e` label, and the full
// suite on push to `main`) before adding it here — so `main` gates on real
// coverage without flipping the entire legacy suite on at once and going red.
//
// UNPARKED[project] lists the spec globs that run; every other spec under the
// project's testDir stays parked. Extend a list once its journey is green in
// CI. The still-parked specs are tracked in e2e/README.md.
const UNPARKED: Record<'client' | 'rescue' | 'admin', string[]> = {
  client: [
    '**/registration-and-login.spec.ts',
    '**/adoption-application.spec.ts',
    // ADS-865 (batch A1) — read journeys grounded in the seed, unblocked by
    // the ADS-863 RBAC grants. Each verified green in CI before listing here.
    '**/pet-discovery.spec.ts',
    '**/distance-sorted-search.spec.ts',
    '**/rescue-publishes-adopter-discovers.spec.ts',
    // cannot-apply: fixed to use the viewable 'pending' pet (adopted pets are
    // hidden → 404, no detail page to gate). session-expiry: anon /favorites →
    // Login Required.
    '**/cannot-apply-to-unavailable-pet.spec.ts',
    '**/session-expiry.spec.ts',
    // Unblocked by the applications seed (services/applications/src/db/seed.ts
    // gives John Smith a seeded application). Both tolerate the status PATCH
    // failing — they assert the dashboard reads the persisted state.
    '**/application-tracking.spec.ts',
    '**/application-status-roundtrip.spec.ts',
    // Unblocked by ADS-869 (migration 017 grants adopters self-scoped
    // notifications.update + notifications.prefs.{read,update}).
    // notification-preferences also needed the gateway route (/notifications/
    // preferences, not /users) and the `email` body field — fixed in the spec.
    '**/notification-badge-updates.spec.ts',
    '**/notification-preferences.spec.ts',
    // Batch B chat (ADS-868): unblocked by the chat seed (a John Smith ↔ Paws
    // chat) + the chat service gating on canonical chats.*/messages.* perms.
    // These post a message via API and read it back from the other side.
    '**/adopter-rescue-chat.spec.ts',
    '**/realtime-chat-propagation.spec.ts',
    // Batch C (ADS-868) — UI-only auth/profile journeys. No new gateway routes,
    // no CSRF (the gateway is Bearer-only), grounded in the existing John Smith
    // seed:
    // - form-validation: anonymous /register rejects a malformed email
    //   client-side (Zod) — pure UI, no backend.
    // - email-verification-gating: the seeded (verified) adopter is NOT blocked
    //   from the apply flow — a subset of the merged adoption-application path.
    // - password-reset: /forgot-password shows a confirmation; /reset-password
    //   with a bad token is rejected. Gateway already has POST
    //   /auth/forgot-password + /auth/reset-password.
    '**/form-validation-per-field.spec.ts',
    '**/email-verification-gating.spec.ts',
    '**/password-reset-flow.spec.ts',
    // Batch D (ADS-868) — rewritten from the monolith's CSRF + cookie-session
    // model to the gateway's actual Bearer contract:
    // - api-auth-contract (renamed from api-csrf-and-cookie-contract): asserts
    //   there's NO CSRF gate (a bad-creds login is 401 not 403), no /csrf-token
    //   endpoint (404), and a tokenless protected read is 401.
    // - logout-flow: a Bearer-authenticated logout revokes the refresh token
    //   (200), then the SPA falls back to "Login Required" once wiped.
    // - rate-limit-application-submission: login responses carry the
    //   x-ratelimit-* headers @fastify/rate-limit emits (no CSRF dance).
    '**/api-auth-contract.spec.ts',
    '**/logout-flow.spec.ts',
    '**/rate-limit-application-submission.spec.ts',
    // profile-update-persistence: deferred. The bio edit submits and the
    // gateway/auth map+persist `bio`, and GET /auth/me returns it, but the
    // value does not round-trip back into the edit form after a reload (the
    // assertion at spec line 47 timed out across all 3 CI retries). Likely the
    // client hydrates a stale cached user instead of refetching /me — needs
    // dedicated runtime debugging before un-parking (tracked under ADS-868).
  ],
  rescue: [
    // ADS-866 (batch A2) — rescue-staff journeys, unblocked by the ADS-863
    // RBAC grants + rescueId propagation. Page-load smokes prove the rescue
    // app's protected routes mount for rescue.manager; the invitation specs
    // assert anonymous invalid/empty-token states on /accept-invitation. Each
    // verified green in CI before listing here.
    '**/pet-listing-management.spec.ts',
    '**/staff-management.spec.ts',
    '**/home-visit-scheduling.spec.ts',
    '**/staff-invitation-acceptance.spec.ts',
    '**/invitation-expiry-and-resend.spec.ts',
    // Unblocked by the applications seed — the rescue (Paws) inbox now lists
    // John Smith's seeded application. Tolerant of the status PATCH failing.
    '**/application-review.spec.ts',
    // rescue-onboarding: rescue publishes a pet (createAvailablePet, same path
    // the merged adoption journey exercises) → adopter discovery feed lists it.
    // archive-adopted-pet: reads the seeded adopted pet 'Max' (now Paws-owned)
    // as Paws staff; rescue_staff has pets.read + pets.archive.
    '**/rescue-onboarding.spec.ts',
    '**/archive-adopted-pet.spec.ts',
    // Batch B chat (ADS-868): rescue staffer posts to the seeded chat, adopter
    // reads it back. Unblocked by the chat seed + canonical chat perms.
    '**/messaging-applicants.spec.ts',
    // bulk-edit-pets is a page-load smoke for /analytics (mislabeled file) —
    // same low-risk pattern as the other rescue page-loads.
    '**/bulk-edit-pets.spec.ts',
    // Batch F (ADS-868) — full-stack feature: rescue-service application-
    // questions RPCs (proto + handlers) + the /api/v1/rescues/:id/questions
    // gateway routes. A rescue admin lists (core baseline) + creates a custom
    // question and sees it on re-list.
    '**/custom-application-questions.spec.ts',
    // Still deferred (full feature build, ADS-868):
    // - 2fa-enrollment → /auth/2fa/* RPCs not built yet
  ],
  admin: [
    // ADS-867 (batch A3) — admin journeys. superadmin storageState
    // short-circuits all permission checks (ADS-863), and the auth-route
    // rate-limit ceiling was lifted for e2e (#1083). Page-load smokes prove the
    // protected routes mount; role-boundary checks the anonymous redirect;
    // field-permission-override hits the admin-only defaults API. Routes
    // verified against apps/admin/src/App.tsx before listing.
    '**/role-boundary-enforcement.spec.ts',
    '**/field-permission-override.spec.ts',
    '**/audit-log-and-settings.spec.ts',
    '**/user-and-rescue-moderation.spec.ts',
    '**/content-moderation-queue.spec.ts',
    '**/support-ticket-triage.spec.ts',
    '**/blog-post-publishing.spec.ts',
    // Batch E (ADS-868) — new gateway routes. bulk-user-actions exercises the
    // /api/v1/admin/users surface (list, detail, PATCH :id/action suspend|
    // reactivate) wired in services/gateway/src/routes/users.ts onto the
    // existing auth admin RPCs.
    '**/bulk-user-actions.spec.ts',
    // Batch G (ADS-868) — full 2FA feature: proto + auth setup/enable/disable
    // handlers (otplib TOTP) + login enforcement (LoginResponse.
    // two_factor_required) + /auth/2fa/* gateway routes + the lib.auth login
    // prompt. Runs on a throwaway account so the enabled 2FA can't leak into
    // a shared persona's login.
    '**/2fa-enrollment.spec.ts',
  ],
};

// Run exactly the listed specs — or nothing (a never-matching pattern) when a
// project has no validated journeys yet, keeping it fully parked.
const onlyUnparked = (specs: string[]): Array<string | RegExp> =>
  specs.length > 0 ? specs : [/$a^/];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    extraHTTPHeaders: {
      'x-e2e-run': process.env.E2E_RUN_ID ?? 'local',
    },
  },
  projects: [
    {
      // Direct gateway probe — proves the API edge is reachable, the
      // seeded personas resolve, and the auth login contract returns the
      // documented shape. This is the only meaningful signal until the
      // UI / API surface is reworked against the gateway's new contract.
      name: 'gateway-smoke',
      testDir: './tests/gateway-smoke',
      use: { baseURL: URLS.api },
    },
    // Each project runs only its UNPARKED specs (see above); the rest stay
    // parked. global-setup logs in every role via the UI and writes its
    // storageState, so a project starts authenticated as soon as it's
    // un-parked.
    {
      name: 'client',
      testDir: './tests/client',
      testMatch: onlyUnparked(UNPARKED.client),
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.client,
        storageState: AUTH_FILES.adopter,
      },
    },
    {
      name: 'rescue',
      testDir: './tests/rescue',
      testMatch: onlyUnparked(UNPARKED.rescue),
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.rescue,
        storageState: AUTH_FILES.rescue,
      },
    },
    {
      name: 'admin',
      testDir: './tests/admin',
      testMatch: onlyUnparked(UNPARKED.admin),
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.admin,
        storageState: AUTH_FILES.admin,
      },
    },
  ],
});
