// Stage B — matching response adapter.
//
// service.matching returns proto-JSON PetCandidate (camelCase, optional
// breed/age/image). The frontend uses two contracts on top of these:
//
//   1. lib.discovery — POST /api/v1/discovery/queue returns
//      { pets: Pet[], currentIndex, hasMore, nextBatchSize }. The "pets"
//      shape is the snake_case lib.pets PetSchema (only pet_id + name
//      are required; everything else optional), and pages of more pets
//      come from POST /api/v1/discovery/pets/more.
//   2. lib.search — GET /api/v1/search/pets returns a paginated list.
//
// Both surfaces are read-only, so the adapter is one-directional: proto
// PetCandidate → frontend pet view, then build the per-route envelope.

import type { PetCandidate, RecommendResponse, SearchPetsResponse } from '@adopt-dont-shop/proto';

export type DiscoveryPetView = {
  pet_id: string;
  name: string;
  rescue_id: string;
  type?: string;
  breed?: string;
  age?: string;
  short_description?: string;
  primary_image_url?: string;
  // The recommender's score, on [0,1]. Plain search doesn't carry it.
  score?: number;
};

// proto PetCandidate.species → frontend `type` (the lib.pets enum:
// 'dog'|'cat'|'rabbit'|…). Pass through untouched — the proto stores the
// lowercase token in `species` already.
export function petCandidateToView(c: PetCandidate, includeScore = true): DiscoveryPetView {
  const view: DiscoveryPetView = {
    pet_id: c.petId,
    name: c.name,
    rescue_id: c.rescueId,
  };
  if (c.species !== undefined && c.species !== '') {
    view.type = c.species;
  }
  if (c.breed !== undefined) {
    view.breed = c.breed;
  }
  if (c.age !== undefined) {
    view.age = c.age;
  }
  if (c.shortDescription !== undefined) {
    view.short_description = c.shortDescription;
  }
  if (c.primaryImageUrl !== undefined) {
    view.primary_image_url = c.primaryImageUrl;
  }
  // Score is only meaningful on Recommend responses — SearchPets drops it.
  if (includeScore) {
    view.score = c.score;
  }
  return view;
}

export type DiscoveryQueueView = {
  pets: DiscoveryPetView[];
  currentIndex: number;
  hasMore: boolean;
  nextBatchSize: number;
};

// Recommend → the discovery queue the SPA expects. `hasMore` is the
// inverse of the recommender's `exhausted` flag; `nextBatchSize` mirrors
// the default the frontend service requests.
export function recommendToQueue(res: RecommendResponse): DiscoveryQueueView {
  return {
    pets: res.candidates.map(c => petCandidateToView(c, true)),
    currentIndex: 0,
    hasMore: !res.exhausted,
    nextBatchSize: 20,
  };
}

export type SearchPetsView = {
  results: DiscoveryPetView[];
  next_cursor?: string;
};

// SearchPets carries no score per the proto comment, so the view omits it.
export function searchToView(res: SearchPetsResponse): SearchPetsView {
  const view: SearchPetsView = {
    results: res.results.map(c => petCandidateToView(c, false)),
  };
  if (res.nextCursor !== undefined && res.nextCursor !== '') {
    view.next_cursor = res.nextCursor;
  }
  return view;
}
