/**
 * Geolocation utility functions for distance calculations
 *
 * Uses the Haversine formula for calculating distances between
 * two points on Earth's surface given their latitude and longitude.
 */

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
