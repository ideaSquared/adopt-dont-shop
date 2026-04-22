/**
 * Geolocation utility functions for distance calculations
 *
 * Uses the Haversine formula for calculating distances between
 * two points on Earth's surface given their latitude and longitude.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const wkx = require('wkx') as { Geometry: { parse(buf: Buffer): { toGeoJSON(opts?: object): unknown } } };

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MILES = 3959;
const KM_PER_MILE = 1.60934;
const MILES_PER_KM = 0.621371;

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Calculate the Haversine distance between two coordinates
 *
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @param unit - Distance unit ('miles' or 'km')
 * @returns Distance in the specified unit
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: 'miles' | 'km' = 'miles'
): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const radius = unit === 'miles' ? EARTH_RADIUS_MILES : EARTH_RADIUS_KM;
  return radius * c;
};

/**
 * Convert miles to kilometers
 */
export const milesToKilometers = (miles: number): number => miles * KM_PER_MILE;

/**
 * Convert kilometers to miles
 */
export const kilometersToMiles = (km: number): number => km * MILES_PER_KM;

/**
 * Validate latitude value
 */
export const isValidLatitude = (lat: number): boolean =>
  typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;

/**
 * Validate longitude value
 */
export const isValidLongitude = (lng: number): boolean =>
  typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;

/**
 * Validate a coordinate pair
 */
export const isValidCoordinates = (lat: number, lng: number): boolean =>
  isValidLatitude(lat) && isValidLongitude(lng);

/**
 * Distance filter presets in miles
 */
export const DISTANCE_PRESETS = {
  NEARBY: 10,
  LOCAL: 25,
  REGIONAL: 50,
  EXTENDED: 100,
  NATIONWIDE: 250,
} as const;

type GeoCoords = { lat: number; lng: number };
type GeoJsonPoint = { type: string; coordinates: [number, number] };

/**
 * Extract lat/lng from a location value that may be:
 * - A GeoJSON object:  { type: 'Point', coordinates: [lng, lat] }
 * - A WKB hex string:  '0101000020E6100000...' (what PostGIS returns when the
 *                       Sequelize type parser hasn't been registered for the OID)
 * - A JSON string:     '{"type":"Point","coordinates":[-0.12,51.5]}'
 * Returns null if the value cannot be parsed.
 */
export const extractCoordinates = (location: unknown): GeoCoords | null => {
  if (!location) return null;

  // GeoJSON object
  if (typeof location === 'object' && 'coordinates' in (location as object)) {
    const [lng, lat] = (location as GeoJsonPoint).coordinates;
    if (isValidLatitude(lat) && isValidLongitude(lng)) return { lat, lng };
    return null;
  }

  if (typeof location === 'string') {
    // JSON string
    if (location.startsWith('{')) {
      try {
        const parsed = JSON.parse(location) as GeoJsonPoint;
        if (parsed?.coordinates) {
          const [lng, lat] = parsed.coordinates;
          if (isValidLatitude(lat) && isValidLongitude(lng)) return { lat, lng };
        }
      } catch { /* not JSON */ }
      return null;
    }

    // WKB hex string — use wkx to parse
    try {
      const geom = wkx.Geometry.parse(Buffer.from(location, 'hex'));
      const gj = geom.toGeoJSON({ shortCrs: true }) as GeoJsonPoint;
      if (gj?.coordinates) {
        const [lng, lat] = gj.coordinates;
        if (isValidLatitude(lat) && isValidLongitude(lng)) return { lat, lng };
      }
    } catch { /* not a valid WKB */ }
  }

  return null;
};
