// Distance badge for the search results and the pet detail page.
//
// The caller's coordinates arrive in the optional `x-client-location:
// <lat>,<lng>` request header (see parseClientLocationHeader; the legacy
// `lat` / `lng` query params are still read for stale clients). They are used
// only in memory for this request: never logged (the gateway never logs
// headers, and the name is on the redaction lists) and never persisted. A
// distance is decoration, so a missing coordinate on either side, or a failed
// lookup, simply means no `distance` field — never an error.

import type { Metadata } from '@grpc/grpc-js';

import {
  CLIENT_LOCATION_HEADER,
  haversineMiles,
  parseClientLocationHeader,
  parseUserLocation,
  type LatLng,
} from '@adopt-dont-shop/service-bootstrap';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

// One short attempt, no retries: the pets read must not wait on this.
const RESCUE_LOCATION_BUDGET = { deadlineMs: 750, maxRetries: 0 };

// The caller's location: the `x-client-location` header (preferred — a header
// never appears in URL-keyed logs), else the legacy `lat` / `lng` query params
// that already-deployed clients still send. Invalid or absent => undefined.
export const readUserLocation = (request: {
  headers: Record<string, unknown>;
  query?: { lat?: string | undefined; lng?: string | undefined } | undefined;
}): LatLng | undefined =>
  parseClientLocationHeader(request.headers[CLIENT_LOCATION_HEADER]) ??
  parseUserLocation(request.query?.lat, request.query?.lng);

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
