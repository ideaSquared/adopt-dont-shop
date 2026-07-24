# Matching System — State of Implementation and Remaining Gaps

> **ADS-85 deliverable** (July 2026). This document replaces `docs/frontend/recommendations-plan.md` as the canonical state-of-the-world reference for the matchmaking/recommendation subsystem. That earlier document was written before implementation began and is now outdated — it should be read as an archived design artefact, not as a current plan.

## Summary

The matchmaking system is **substantially built**. Phase 1 of the recommendations plan (rule-based scoring) is live across all layers: gRPC service, gateway routes, frontend library client, and client app pages. The primary decision for the team is whether to close the eight remaining gaps now or track them as follow-on tickets.

---

## What Is Implemented

### Backend — `services/matching`

The matching microservice owns the `matching.*` Postgres schema and exposes a full gRPC API via `MatchingService` (`packages/proto/proto/adopt_dont_shop/matching/v1/matching.proto`).

**Session lifecycle**
- `StartSession` — creates or resumes an active swipe session; idempotent.
- `EndSession` — marks session inactive, stamps `end_time`.

**Swipe feed recommender (`Recommend`)**
- Pulls available pets from `service.pets` via gRPC.
- Scores with a weighted blend: recency (0.4) + promotion (0.3) + age-group preference match (0.3).
- Excludes pets already swiped in the current session.
- Returns a ranked `PetCandidate[]` with per-pet scores on `[0, 1]`.

**Swipe recording (`RecordSwipe`)**
- Persists a `matching.swipe_actions` row inside a transaction and publishes `matching.swipeRecorded` to NATS after commit.
- Increments session counters (`total_swipes`, `likes`, `passes`, `super_likes`).

**Top picks (`GetTopPicks`)**
- Reads the adopter's stored match profile (`matching.adopter_match_profiles`).
- Scores against preferred types / sizes / age groups + lifestyle household flags.
- Scoring: preference match (0.5) + recency (0.3) + promotion (0.2).
- Attaches human-readable reason chips: `pref_match`, `lifestyle` (good with children / dogs / cats), `fresh`.
- Excludes already-swiped pets; resolves each pick's rescue name via gRPC.

**Match profile (`GetMatchProfile` / `UpsertMatchProfile`)**
- Stores per-adopter preferences: `preferred_types`, `preferred_sizes`, `preferred_age_groups`, `preferred_energy`, `preferred_temperament`, `lifestyle`, `max_distance_km`, `open_to_special_needs`, `allergies`, `notify_new_matches`, `min_notification_score`.
- Upsert is partial-update safe (`set_*` booleans distinguish "clear" from "not provided").

**Search and history**
- `SearchPets` — filter-driven search, distinct from preference-driven recommendation.
- `ListSwipeHistory` — cursor-paginated log of likes / passes / super-likes / info-views.

**Statistics**
- `GetUserSwipeStats` — aggregate swipe counts per user.
- `GetSessionStats` — aggregate swipe counts per session.

**GDPR**
- `gdpr/erase.ts` — erases a user's swipe sessions and actions on account deletion.

**Database migrations (4 applied)**
1. `001_create_swipe_sessions`
2. `002_create_swipe_actions`
3. `003_create_adopter_match_profiles`
4. `004_swipe_actions_user_pet_recency_idx`

### Gateway — `services/gateway`

REST routes registered under `services/gateway/src/routes/matching.ts`:

| Method | Path | RPC |
|--------|------|-----|
| POST | `/api/v1/matching/sessions` | `StartSession` |
| POST | `/api/v1/matching/sessions/:id/end` | `EndSession` |
| POST | `/api/v1/matching/sessions/:id/swipes` | `RecordSwipe` |
| GET | `/api/v1/matching/swipes` | `ListSwipeHistory` |
| POST | `/api/v1/discovery/queue` | `Recommend` |
| POST | `/api/v1/discovery/pets/more` | `Recommend` (load-more variant) |
| GET | `/api/v1/search/pets` | `SearchPets` |
| GET | `/api/v1/match/top-picks` | `GetTopPicks` |
| GET | `/api/v1/match/profile` | `GetMatchProfile` |
| PUT | `/api/v1/match/profile` | `UpsertMatchProfile` |

### Frontend library — `packages/lib.matching`

`matching-service.ts` exposes three typed methods for the React apps:
- `getTopPicks(limit?)` — fetches the curated top-picks list.
- `getMatchProfile()` — reads the stored preferences form state.
- `updateMatchProfile(profile)` — persists preference form changes.

### Client app — `apps/client`

- **`TopPicksPage`** — renders the curated list with reason chips.
- **`OnboardingWizardPage`** — preference collection wizard that calls `updateMatchProfile`.
- **`DiscoveryPage`** — swipe feed backed by `Recommend`; falls back to an unscored queue for anonymous users.
- **`SwipeStack` / `SwipeCard` / `SwipeControls`** — swipe-card UI components.
- **`AnonymousFirstLikeModal` / `AnonymousSwipePaywallModal`** — auth-gate modals for non-authenticated users.

---

## Remaining Gaps

The eight gaps below are all schema columns or proto fields that exist in the data model but are not yet wired into the scoring or delivery pipelines.

### 1. Swipe-history inference never populates `inferred_prefs`

**Gap:** `matching.adopter_match_profiles.inferred_prefs` defaults to `{}` and is never updated. Every `RecordSwipe` publishes a `matching.swipeRecorded` NATS event, but no consumer reads it to update the profile.

**Impact:** The recommender can only use explicit preferences the adopter set manually. Implicit signals (likes, super-likes, info-taps) carry no weight.

**Effort:** Medium. Requires a NATS consumer that aggregates per-type/size/age-group like-rate from `swipe_actions`, applies exponential decay, and upserts `inferred_prefs`. The scorer then needs to blend `inferred_prefs` into the `Recommend` ranking. Estimated 3–5 days.

**Recommendation:** Build. This is the lowest-hanging path from rule-based to genuinely personalised recommendations.

---

### 2. `preferred_energy` and `preferred_temperament` stored but not scored

**Gap:** Both JSONB columns are stored and returned in `GetMatchProfile`, but neither `recommend-scoring.ts` nor `top-picks-scoring.ts` reads them. The `TopPickPreferences` type has no energy or temperament dimension.

**Impact:** An adopter who sets "low energy" or "gentle temperament" preferences gets no ranking benefit for doing so.

**Effort:** Low. The pet `extraJson` blob already carries `energyLevel`/`temperament` keys (same pattern as `goodWithChildren`). Add two dimensions to `TopPickPreferences`, read them in `loadPreferences`, and extend `preferenceMatchScore`. Estimated 1–2 days.

**Recommendation:** Build in the same pass as gap 1 — the scoring function changes are co-located.

---

### 3. Distance filtering stored but pets have no location data

**Gap:** `max_distance_km` is stored and surfaced to the adopter via `GetMatchProfile`, but the `Pet` proto message (`packages/proto/proto/adopt_dont_shop/pets/v1/pet.proto`) has no location coordinates. The distance dimension from the original recommendations plan cannot be implemented without adding latitude/longitude to the pets schema.

**Impact:** Adopters who set a distance preference get no filtering benefit. The field is visible in the UI but inert.

**Effort:** High (prerequisite is out of scope). Adding location to `service.pets` requires: a new migration on the pets schema, updated `Pet` proto fields, PostGIS queries in the pets list endpoint, and then consuming the location in the matching scorer. Estimated 5–8 days net of pets-service changes.

**Recommendation:** Defer. Track as a separate ticket under the pets service. Remove the `max_distance_km` field from the onboarding wizard UI until the feature can be delivered end-to-end, to avoid misleading adopters.

---

### 4. `similar_to_liked` reason chip not implemented

**Gap:** The `TopPickReasonChip` kind vocabulary in the proto comment lists `similar_to_liked` as a valid chip, but no code emits it. `buildReasons` in `top-picks-scoring.ts` can only produce `pref_match`, `lifestyle`, and `fresh`.

**Impact:** The "you liked pets like this" explainability chip is absent.

**Effort:** Medium. Requires loading the adopter's like history (already available via `fetchSwipedPetIds`; would need to filter for LIKE/SUPER_LIKE only) and comparing attribute overlap with the candidate. Estimated 2–3 days.

**Recommendation:** Defer until `inferred_prefs` inference (gap 1) is live — both read the like history; co-locating the work avoids two separate query passes.

---

### 5. Allergy filtering stored but not applied

**Gap:** `allergies` is persisted in `adopter_match_profiles` and echoed in `GetMatchProfile`, but no code filters candidates against it.

**Impact:** An adopter who indicates a cat allergy may still be shown cats in their top picks.

**Effort:** Low–Medium. Allergies would need to be normalised (currently a `varchar(255)` free-text field, not a structured enum) before reliable filtering is possible. If structured: add a check in `listAvailablePets` or post-filter in the handler. Estimated 1 day for structured allergies; 2–3 days if the field needs normalising first.

**Recommendation:** Normalise the schema (change `varchar` to a JSONB array of known allergy tokens) and implement filtering in a single ticket.

---

### 6. Match notification pipeline not delivered

**Gap:** `notify_new_matches` and `min_notification_score` are stored and respected in `GetMatchProfile`, but there is no worker or cron job that reads them to deliver "new pet matched your preferences" notifications. `last_notified_at` is never written.

**Impact:** Adopters who opt in to match notifications receive nothing.

**Effort:** Medium. Requires a scheduled worker (or event-driven consumer on pet-listed events) that: queries `adopter_match_profiles` where `notify_new_matches = true`, scores new pets against each profile, and calls the notifications service for profiles whose best new score exceeds `min_notification_score`. Estimated 4–6 days including integration with `service.notifications`.

**Recommendation:** Defer to a dedicated ticket. Gate the "Notify me about new matches" toggle behind a feature flag until the pipeline ships.

---

### 7. `breed_name` and `photo_url` not populated in `TopPick`

**Gap:** The `TopPick` proto message has `optional breed_name` and `optional photo_url` fields. The proto comment notes: "Pets has no breed NAME (only breed_id) and no photo/image field, so these stay unset until that data is available." The `toTopPick` mapper in `top-picks-handlers.ts` never sets either field.

**Impact:** The top picks UI cannot render a pet photo or breed name; the SPA's `MatchTopPick` type marks both as optional for exactly this reason.

**Effort:** Medium–High (prerequisite). Breed name requires a breed lookup in `service.pets`; photos require a pet image storage/retrieval layer. Both are pets-service concerns. Estimated 3–5 days once the pets service exposes the data.

**Recommendation:** Defer. Track as a pets-service enhancement.

---

### 8. Rescue-side swipe analytics not exposed

**Gap:** Every `RecordSwipe` writes a `swipe_actions` row and publishes a NATS event. There is no rescue-facing API or dashboard surface for rescues to see swipe interest in their pets (likes, views, super-likes by pet).

**Impact:** Rescues cannot see which pets are generating interest in the discovery feed, limiting their ability to prioritise promotion or update listings.

**Effort:** Medium. The data exists in `swipe_actions`. A new gRPC RPC (`GetRescueSwipeStats`) scoped to the rescue's pet IDs and a corresponding gateway route and `app.rescue` page would close this gap. Estimated 3–4 days.

**Recommendation:** Build. Rescue engagement is a stated product goal, and this is a straightforward read-path addition that doesn't touch any write logic.

---

## Verdict

Phase 1 of the recommendations plan is complete. The system provides personalised, explainable rankings backed by adopter preferences and recency signals, with reason chips and real-time swipe recording.

| Gap | Build / Defer | Effort |
|-----|---------------|--------|
| Swipe-history → `inferred_prefs` inference | **Build** | Medium (3–5d) |
| Energy + temperament scoring | **Build** | Low (1–2d) |
| Rescue swipe analytics | **Build** | Medium (3–4d) |
| `similar_to_liked` reason chip | Defer (after gap 1) | Medium (2–3d) |
| Allergy filtering | Defer (normalise schema first) | Low–Medium (1–3d) |
| Match notification pipeline | Defer (feature-flag) | Medium (4–6d) |
| Distance filtering | Defer (pets location prerequisite) | High (5–8d) |
| `breed_name` / `photo_url` in TopPick | Defer (pets prerequisite) | Medium–High (3–5d) |

Immediate next tickets: inferred-prefs inference + energy/temperament scoring (can be a single PR), and rescue swipe analytics (separate PR). The deferred gaps each have a clear prerequisite that blocks them independently of scoring work.
