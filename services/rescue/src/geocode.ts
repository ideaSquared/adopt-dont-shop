// Postcode → coordinates for rescues, behind an injectable function so
// handlers and tests never touch the network unless a geocoder is wired in.
//
// The default implementation calls postcodes.io (free, no key, UK only) with
// the rescue's postcode — a business address already shown publicly. It never
// throws: any failure (network, timeout, unknown postcode, bad payload)
// resolves to undefined and the rescue is simply saved without coordinates.

export type Coordinates = { latitude: number; longitude: number };

export type Geocoder = (postcode: string) => Promise<Coordinates | undefined>;

const POSTCODES_IO_URL = 'https://api.postcodes.io/postcodes';
const DEFAULT_TIMEOUT_MS = 3_000;

type PostcodesIoResponse = {
  result?: { latitude?: unknown; longitude?: unknown } | null;
};

const isCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export type PostcodesIoOptions = {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
};

export const createPostcodesIoGeocoder =
  (opts: PostcodesIoOptions = {}): Geocoder =>
  async postcode => {
    const fetchFn = opts.fetchFn ?? fetch;
    const trimmed = postcode.trim();
    if (trimmed === '') {
      return undefined;
    }
    try {
      const res = await fetchFn(`${POSTCODES_IO_URL}/${encodeURIComponent(trimmed)}`, {
        signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
      if (!res.ok) {
        return undefined;
      }
      const body = (await res.json()) as PostcodesIoResponse;
      const { latitude, longitude } = body.result ?? {};
      return isCoordinate(latitude) && isCoordinate(longitude)
        ? { latitude, longitude }
        : undefined;
    } catch {
      return undefined;
    }
  };
