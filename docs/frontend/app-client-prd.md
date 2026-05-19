# Product Requirements Document: Client App

## Overview

The Client App is the public-facing React application for potential pet adopters. It provides a modern, intuitive interface for discovering pets, communicating with rescues, and managing adoption applications.

## Target Users

- **Primary**: Potential pet adopters (individuals and families)
- **Secondary**: General public interested in pet adoption
- **Tertiary**: Returning users managing ongoing applications

## Key Features

### 1. Pet Discovery & Browsing

#### Dual Discovery Experience

**Swipe Interface (`/discover`)**

- Tinder-style swipe interface with React Spring + Use-Gesture
- Gesture support: touch, mouse, keyboard navigation (arrows / Enter / Esc)
- Smart actions: right (like), left (pass), up (super like), down (info)
- Color-coded overlays with spring animations
- Infinite queue with intelligent preloading (next 5 pets)
- **Session resume**: persisted via `localStorage` (`discovery.sessionId` + last viewed pet IDs); queue resumes excluding already-viewed pets across reloads
- Per-swipe analytics via Statsig + `discoveryService.recordSwipeAction`

**Traditional Search (`/search`)**

- Advanced search with filters
- Grid view with card-based browsing
- **Active filters**: type, size, gender, age group, status, distance, free-text
- **Sorting**: distance, age, date added

*Out of scope / roadmap:* breed filter, special-needs filter, urgency sort.

**Unified Features**

- Seamless switching between modes
- Detailed pet profiles with photo galleries
- Favorites across both interfaces (swipe likes auto-add to favorites server-side)

*Out of scope / roadmap:* Smart recommendations engine — see [recommendations plan](./recommendations-plan.md) (separate doc, design only).

### 2. User Authentication & Account Management

- Email-based registration with verification (`RegisterPage` → `CheckYourEmailPage` → `VerifyEmailPage`)
- Secure login/logout with JWT (15-min access tokens + httpOnly refresh cookie)
- Password reset and recovery (`ForgotPasswordPage`, `ResetPasswordPage`)
- 2FA via `TwoFactorSettings` from `lib.auth`
- Complete profile with preferences (`ProfilePage`, `ProfileEditForm`)
- Account settings management (`SettingsForm`)
- Account deletion via `authService.deleteAccount`

### 3. Adoption Application System

- **Question-driven dynamic forms** fetched per rescue (`/api/v1/rescues/:id/questions`)
- Progressive form with validation, conditional question logic, and auto-save (drafts)
- Draft restore banner on return
- Pre-fill from previous applications (`applicationProfileService`)
- Quick-apply vs guided modes
- Application history and status tracking (`ApplicationDashboard`, `ApplicationDetailsPage`)
- Application withdrawal flow

*Implementation note:* The earlier "step-component" application flow (`steps/BasicInfo`, `LivingSituation`, etc.) was removed. The live application form is fully question-driven via dynamic rescue questions.

*Out of scope / roadmap:* Document upload as a first-class step (rescue questions can include file inputs but there is no dedicated step UI).

### 4. Communication

- Real-time messaging with rescues (Socket.IO via `lib.chat`)
- Message history and conversation archive
- File attachments
- Message reactions, read receipts, typing indicators
- Email + in-app notifications

*Out of scope / roadmap:* Group / multi-participant chat (data model supports it, UX is 1:1 only today).

### 5. User Settings & Preferences

- **Profile information** (name, email, phone, address)
- **Discovery preferences**: pet types, search radius
- **Notification preferences**: email, push, SMS, marketing, applications, messages, system, reminders, quiet hours
- **Privacy controls**: profile visibility, show email/phone toggles
- **Accessibility**: keyboard nav (built-in), theme toggle (`ThemeToggle` — light/normal/dark)

*Out of scope / roadmap:* Swipe sensitivity preference, characteristic preferences (size/age/energy), reduce-motion preference, default saved-search.

### 6. Analytics & Personalization

- Swipe analytics + engagement tracking via Statsig + backend `recordSwipeAction`
- Session persistence: `localStorage`-backed session ID + last-viewed pet IDs (see §1)
- Backend `discovery` endpoint returns a sorted queue (proximity, freshness, sponsored)

*Out of scope / roadmap:* Behavioural learning / recommendation engine — see [recommendations plan](./recommendations-plan.md). Personal adoption readiness scores — roadmap.

## Technical Requirements

### Performance

- Page load < 2s target
- Search response < 500ms target
- Swipe responsiveness < 100ms
- Image lazy loading + preloading next 5 pets (`useImagePreloader`)
- Animation 60fps via react-spring CSS transforms

### Accessibility

- High-contrast toggle in Settings
- Keyboard navigation across swipe + bottom-tab nav
- ARIA labels on swipe cards + nav
- WCAG 2.1 AA targeted (no formal audit artefact)

*Out of scope / roadmap:* `prefers-reduced-motion` handling.

### Security

- TLS at edge (HTTPS in prod)
- JWT-based auth with httpOnly refresh cookie
- Client + server zod validation
- Backend CSP headers; `SafeHtml` component for sanitised HTML rendering

### Mobile / PWA

- Mobile-first responsive design
- Bottom-tab nav on mobile
- Touch gestures with spring physics
- **PWA enabled** via `vite-plugin-pwa`:
  - `registerType: 'autoUpdate'`
  - Workbox runtime caches: pet list endpoints (NetworkFirst, short TTL), image CDN (CacheFirst, 30 days)
  - Skip caching for chat endpoints (real-time)
  - Manifest + icons (192/512)
  - Install prompt component (`lib.components/InstallPwaBanner`)
- **Offline scope**: chat message queueing only (`offlineManager.ts` buffers outbound messages). Offline pet browsing is roadmap.

### Legal Routes

- `/terms` and `/privacy` routes render content from CMS via `LegalPage.tsx` (same pattern as `BlogPostPage.tsx`)
- Content authored via admin `ContentManagement.tsx`

## Discovery Interface Architecture

### Core Components

- `SwipeCard` — pet card with gesture handling + overlay
- `SwipeStack` — stack rendering + infinite loading
- `SwipeControls` — buttons for non-gesture interaction
- `DiscoveryPage` — orchestrator: filters, session, queue
- Overlay implemented inline in `SwipeCard` (not a separate component)

### Gesture System

- React Spring (animations) + Use-Gesture (detection)
- Keyboard alternatives for every gesture
- Spring physics `{ tension: 300, friction: 30 }`

### Backend Integration

- `GET /api/v1/discovery` for queue, with `lastViewedPetIds` exclusion for resume
- `POST` to record swipe actions
- Filters applied server-side

## User Journey

### New User Flow

1. Landing page with CTA + preview
2. Immediate swipe access (no login required for browsing)
3. Login prompt triggers on apply (`LoginPromptModal`)
4. Account creation with email verification
5. Optional preference setup (Settings)

*Out of scope / roadmap:* Interactive sample-pet demo for unauthenticated users; registration prompt after N interactions in swipe.

### Returning User Flow

1. Quick login
2. **Session resume** in `/discover` (queue continues excluding previously viewed)
3. Notifications + messages surfaces

*Out of scope / roadmap:* Personalised dashboard with personal stats; AI-enhanced recommendations.

### Application Flow

1. Pet selection from search/favorites/swipe
2. Dynamic question-driven form (per rescue)
3. Auto-save with draft restore
4. Submit confirmation
5. Track status from `ApplicationDashboard`

## Success Metrics

### User Engagement

- MAU 15,000+ within 6 months
- Session duration 10+ min average
- Discovery engagement: 75%+ try swipe
- 20+ swipes per session average
- 40%+ return retention

### Conversion

- 20%+ visitor registration
- 15%+ sessions result in favorites
- 85%+ form completion
- < 8 min discover → apply

### Technical

- 95% page loads < 3s
- 95% swipe gestures < 100ms
- Image preload next 5
- 99.9% backend uptime
- < 0.1% error rate
- Lighthouse a11y 95+
- Lighthouse PWA 90+

## Launch Strategy

(Unchanged from prior PRD — soft launch, public launch, post-launch phases.)

## Risk Mitigation

(Unchanged.)

## Future Roadmap

### Near Term

- Recommendations engine (see [recommendations plan](./recommendations-plan.md))
- Breed + special-needs filters
- `prefers-reduced-motion` support
- Swipe sensitivity + characteristic preferences
- Offline pet browsing via PWA cache

### Medium Term

- Group / multi-participant chat UI
- Personal dashboard with personal stats
- Native mobile apps
- Video discovery

### Deferred / De-scoped

- Adoption readiness scores
- AR previews
- Marketplace integration
- VR pet interaction

## Additional Resources

- **Implementation Plan**: [implementation-plan.md](./implementation-plan.md)
- **Technical Architecture**: [technical-architecture.md](./technical-architecture.md)
- **Recommendations Plan**: [recommendations-plan.md](./recommendations-plan.md)
- **API Documentation**: [../backend/api-endpoints.md](../backend/api-endpoints.md)
