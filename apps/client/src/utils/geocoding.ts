const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

export const geocodeLocation = async (query: string): Promise<GeocodeResult | null> => {
  if (!query.trim()) {
    return null;
  }

  const url = `${NOMINATIM_BASE_URL}?q=${encodeURIComponent(query.trim())}&format=json&limit=1`;

  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'adopt-dont-shop/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }

  const results: NominatimResult[] = await response.json();

  if (results.length === 0) {
    return null;
  }

  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
};
