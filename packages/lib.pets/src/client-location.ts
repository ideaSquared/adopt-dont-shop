/**
 * The caller's coordinates travel in the `x-client-location: <lat>,<lng>`
 * request header, never in the URL: a URL ends up in nginx access/error logs,
 * Sentry events and trace attributes, a header does not. The gateway reads the
 * header (strictly validated) to fill in each pet's `distance`.
 */
export const CLIENT_LOCATION_HEADER = 'x-client-location';

export type ClientLocation = { latitude: number; longitude: number };

/**
 * Per-request options carrying the location header, or `undefined` when the
 * location is missing or not a pair of finite numbers (callers then make the
 * plain request).
 */
export const clientLocationOptions = (
  location: Partial<ClientLocation> | undefined
): { headers: Record<string, string> } | undefined => {
  const { latitude, longitude } = location ?? {};
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return undefined;
  }
  return { headers: { [CLIENT_LOCATION_HEADER]: `${latitude},${longitude}` } };
};
