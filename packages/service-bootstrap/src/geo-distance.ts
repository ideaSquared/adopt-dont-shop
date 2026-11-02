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

// The filters blob arrives from the SPA as JSON; its query-style values may be
// numbers or numeric strings. Anything missing or out of range yields
// undefined (no distance), never an error.
export function parseUserLocation(latitude: unknown, longitude: unknown): LatLng | undefined {
  const lat = typeof latitude === 'string' && latitude.trim() !== '' ? Number(latitude) : latitude;
  const lng =
    typeof longitude === 'string' && longitude.trim() !== '' ? Number(longitude) : longitude;
  return isValidLatLng(lat, lng) ? { latitude: Number(lat), longitude: Number(lng) } : undefined;
}
