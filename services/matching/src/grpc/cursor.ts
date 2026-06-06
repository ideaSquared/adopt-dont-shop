// Base64-JSON keyset cursor helper for MatchingService's list RPCs.
//
// Two cursor shapes — the listing surface mixes pagination shapes:
//
//   - ListSwipeHistory uses (timestamp, swipe_action_id). Stable
//     across new inserts because swipe_actions is append-only.
//
//   - SearchPets uses (score, pet_id). The score is the recommender
//     ranking value on [0.0, 1.0]; ties break on pet_id. Less stable
//     than the timestamp cursor (a recommender rerank between pages
//     could shift the order) but acceptable for a search UX.
//
// Both encode as base64-JSON. Same shape as services/audit and
// services/moderation cursor helpers.

import { Buffer } from 'node:buffer';

export type SwipeHistoryCursor = {
  timestamp: string;
  swipeActionId: string;
};

export type SearchPetsCursor = {
  // Score on [0.0, 1.0]; ranking value the recommender attached.
  score: number;
  petId: string;
};

export class InvalidCursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

export function encodeSwipeHistoryCursor(cursor: SwipeHistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeSwipeHistoryCursor(raw: string): SwipeHistoryCursor {
  const parsed = parseBase64Json(raw);
  if (
    typeof (parsed as { timestamp?: unknown }).timestamp !== 'string' ||
    typeof (parsed as { swipeActionId?: unknown }).swipeActionId !== 'string'
  ) {
    throw new InvalidCursorError('cursor missing timestamp or swipeActionId');
  }
  return parsed as SwipeHistoryCursor;
}

export function encodeSearchPetsCursor(cursor: SearchPetsCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeSearchPetsCursor(raw: string): SearchPetsCursor {
  const parsed = parseBase64Json(raw);
  if (
    typeof (parsed as { score?: unknown }).score !== 'number' ||
    typeof (parsed as { petId?: unknown }).petId !== 'string'
  ) {
    throw new InvalidCursorError('cursor missing score or petId');
  }
  return parsed as SearchPetsCursor;
}

function parseBase64Json(raw: string): object {
  let json: string;
  try {
    json = Buffer.from(raw, 'base64url').toString('utf8');
  } catch {
    throw new InvalidCursorError('cursor is not valid base64url');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidCursorError('cursor does not decode to JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new InvalidCursorError('cursor is not an object');
  }
  return parsed;
}
