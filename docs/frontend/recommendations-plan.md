# Recommendations Plan

Design-only document. No implementation yet. The client PRD's "AI-Powered Pet Matching" marketing copy and the rescue PRD's "AI matching" roadmap item both point at this plan.

## Goal

Replace the current generic discovery queue (recency + proximity + sponsored) with a personalised, explainable recommendation ranking. Phased delivery — start rule-based, evaluate adding ML in a later iteration.

## Phase 1 — Rule-based recommendations

### Inputs

- **User preferences**: pet types (current Settings), search radius (current Settings).
- **Interaction history**:
  - `SwipeAction` rows for the user (existing model). Like / pass / super_like counts per pet type, age bucket, size, breed.
  - `UserFavorite` rows.
  - `PetView` events emitted from `PetDetailsPage` and the chat link click (new — light-weight `analytics_events` table is sufficient; no dedicated `PetView` model needed).
- **Pet attributes**: type, breed, age bucket (0–1y / 1–5y / 5–10y / 10y+), size, energy level, special-needs flag.
- **Proximity**: PostGIS distance (existing).
- **Freshness**: `pet.createdAt` recency bucket.
- **Negative signals**: pets the user has passed or already viewed (see `discoverySession.viewedPetIds`).

### Scoring

Weighted sum of normalised feature scores (0–1):

| Feature | Weight (initial) |
|---|---:|
| Pet-type preference match | 0.30 |
| Breed/size affinity (from like history) | 0.20 |
| Age-bucket affinity | 0.10 |
| Distance fit (closer = higher) | 0.20 |
| Freshness | 0.10 |
| Special-needs match | 0.05 |
| Sponsored boost (non-overriding) | 0.05 |

Weights live in the matching service (`services/matching`) as a typed config. Statsig dynamic config can override at runtime so tuning doesn't require a deploy.

### Output

`GET /api/v1/discovery/recommendations?limit=20` returns:

```json
{
  "items": [
    {
      "petId": "uuid",
      "score": 0.83,
      "breakdown": {
        "type": 0.30,
        "breed": 0.18,
        "age": 0.08,
        "distance": 0.17,
        "freshness": 0.05,
        "specialNeeds": 0.0,
        "sponsored": 0.05
      }
    }
  ]
}
```

`breakdown` is included for **explainability** — admins / support can answer "why is this pet at the top of my queue?" without re-deriving the score. Frontend hides it from end users.

### Service shape

- Recommendation logic in the matching service (`services/matching`):
  - `computeFeatureVector(user, pet)` → numeric features
  - `score(features, weights)` → number
  - `getRecommendations(userId, filters, limit)` → ordered `PetId[]`
- Exposed behind `GET /api/v1/discovery/recommendations` via the gateway (`services/gateway`).
- Excludes `discoverySession.viewedPetIds` via query param `excludePetIds=...` (frontend sends from localStorage).
- Caches per `(userId, filterHash)` for 60s in Redis to keep p95 under 300ms when the queue is paginated.

### Frontend integration

- `lib.discovery/src/services/discovery-service.ts` adds `getRecommendations(filters)` alongside the existing `getDiscoveryQueue`.
- `DiscoveryPage` calls `getRecommendations` when the user is authenticated; falls back to `getDiscoveryQueue` for anonymous browsers.

### Marketing claim alignment

- `SwipeHero.tsx` currently says "AI-Powered Pet Matching". Until Phase 2 ships, change the copy to "Smart matching based on your preferences and history" so the claim matches what's actually running.

## Phase 2 — Co-occurrence (optional)

If Phase 1 metrics show flat conversion, layer in collaborative-filtering:

- Co-occurrence matrix: for each pet, which other pets do users who liked it also like?
- Score boost = `cosine(user_likes, pet_likers)` × 0.15, reducing other weights proportionally.
- Built offline in a nightly worker (`workers/recommendations-cooccurrence.worker.ts`) and stored in Redis as `pet:{id}:cooccurring`.

## Phase 3 — Model-based (deferred)

Defer until Phase 1 + Phase 2 are live for at least 30 days and the dataset is meaningfully populated. Then evaluate:

- LightGBM ranker trained on (user_features, pet_features, label = liked/applied).
- Inference served from a sidecar service or via `onnxruntime-node` in-process.
- Same explainability contract — model output must surface top contributing features.

## Out of scope (do NOT bundle)

- Personalised email campaigns.
- Cold-start onboarding quiz (separate feature; could feed the same scoring service).
- Adoption-readiness score (different concept — measures user suitability, not pet relevance).

## Success metrics

- **Engagement**: median swipes per session ↑ ≥ 15% vs control (A/B via Statsig).
- **Conversion**: discover → favorite rate ↑ ≥ 10%.
- **Latency**: `/api/v1/discovery/recommendations` p95 < 300ms.
- **Fairness**: per-rescue exposure variance not worsened ≥ 1.5× baseline (track via `pet_views_by_rescue` aggregate).

## Open questions

1. Do we want a manual "boost" knob for rescues (sponsored slot already exists)? If so, cap exposure to avoid drowning out organic results.
2. Should super-likes have weighted history influence (e.g. 3× a regular like) or just be UX signal? Phase 1 default: 3× weight.
3. How long do we keep `SwipeAction` rows? Privacy / retention worker already truncates after 18 months — confirm that interval is acceptable for the scorer.
