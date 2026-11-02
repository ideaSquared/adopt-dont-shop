// Straight-line distance for the swipe card, search result and pet detail
// badges. Pure functions; the caller's coordinates only ever live in memory
// for the duration of a request.

export type LatLng = { latitude: number; longitude: number };

const EARTH_RADIUS_MILES = 3958.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const isValidLatLng = (latitude: unknown, longitude: unknown): boolean =>
  typeof latitude === 'number' &&
  typeof longitude === 'number' &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 &&
  Math.abs(longitude) <= 180;

// Great-circle distance in miles, rounded to one decimal place.
export function haversineMiles(from: LatLng, to: LatLng): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  const miles = 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
  return Math.round(miles * 10) / 10;
}

// The `x-client-location: <lat>,<lng>` request header: the caller's coordinates,
// carried in a header (not the URL) so they never reach URL-keyed logs such as
// the nginx access/error logs, Sentry request URLs or trace attributes.
// Strict on purpose: exactly two plain decimal numbers, a short value, and
// in-range coordinates. Anything else (absent, malformed, repeated header,
// out of range) is ignored — no distance, never an error.
export const CLIENT_LOCATION_HEADER = 'x-client-location';

const MAX_CLIENT_LOCATION_LENGTH = 40;
const DECIMAL = '-?\\d{1,3}(?:\\.\\d{1,12})?';
const CLIENT_LOCATION_PATTERN = new RegExp(`^\\s*(${DECIMAL})\\s*,\\s*(${DECIMAL})\\s*$`);

export function parseClientLocationHeader(value: unknown): LatLng | undefined {
  if (typeof value !== 'string' || value.length > MAX_CLIENT_LOCATION_LENGTH) {
    return undefined;
  }
  const match = CLIENT_LOCATION_PATTERN.exec(value);
  return match ? parseUserLocation(match[1], match[2]) : undefined;
}

// The filters blob arrives from the SPA as JSON; its query-style values may be
// numbers or numeric strings. Anything missing or out of range yields
// undefined (no distance), never an error.
export function parseUserLocation(latitude: unknown, longitude: unknown): LatLng | undefined {
  const lat = typeof latitude === 'string' && latitude.trim() !== '' ? Number(latitude) : latitude;
  const lng =
    typeof longitude === 'string' && longitude.trim() !== '' ? Number(longitude) : longitude;
  return isValidLatLng(lat, lng) ? { latitude: Number(lat), longitude: Number(lng) } : undefined;
}
