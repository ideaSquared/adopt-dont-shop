// Distance badge for the search results and the pet detail page.
//
// The caller's coordinates arrive as optional `lat` / `lng` query params. They
// are used only in memory for this request: never logged (the gateway logs
// paths, not query strings — see redactUrl) and never persisted. A distance is
// decoration, so a missing coordinate on either side, or a failed lookup,
// simply means no `distance` field — never an error.

import type { Metadata } from '@grpc/grpc-js';

import { haversineMiles, parseUserLocation, type LatLng } from '@adopt-dont-shop/service-bootstrap';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

// One short attempt, no retries: the pets read must not wait on this.
const RESCUE_LOCATION_BUDGET = { deadlineMs: 750, maxRetries: 0 };

export const readUserLocation = (query: {
  lat?: string | undefined;
  lng?: string | undefined;
}): LatLng | undefined => parseUserLocation(query.lat, query.lng);

export async function withDistances<T extends Record<string, unknown>>(
  views: ReadonlyArray<T>,
  userLocation: LatLng | undefined,
  rescueClient: RescueClient | undefined,
  meta: Metadata
): Promise<Array<T & { distance?: number }>> {
  if (userLocation === undefined || rescueClient === undefined) {
    return [...views];
  }
  const rescueIds = [
    ...new Set(
      views.map(v => v.rescue_id).filter((id): id is string => typeof id === 'string' && id !== '')
    ),
  ];
  if (rescueIds.length === 0) {
    return [...views];
  }
  const locations = await rescueClient
    .getRescueLocations({ rescueIds }, meta, RESCUE_LOCATION_BUDGET)
    .then(res => new Map(res.locations.map(l => [l.rescueId, l])))
    .catch(() => new Map<string, { latitude: number; longitude: number }>());

  return views.map(view => {
    const rescue = typeof view.rescue_id === 'string' ? locations.get(view.rescue_id) : undefined;
    return rescue === undefined
      ? view
      : { ...view, distance: haversineMiles(userLocation, rescue) };
  });
}
