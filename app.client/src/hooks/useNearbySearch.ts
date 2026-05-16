import { useState } from 'react';
import { useGeolocation } from './useGeolocation';
import { geocodeLocation } from '@/utils/geocoding';

type UseNearbySearchReturn = ReturnType<typeof useGeolocation> & {
  isGeocodingLocation: boolean;
  geocodeError: string | null;
  handleUseLocationText: (locationText: string) => Promise<void>;
};

export const useNearbySearch = (): UseNearbySearchReturn => {
  const geolocation = useGeolocation();
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const handleUseLocationText = async (locationText: string) => {
    if (!locationText.trim()) return;

    setIsGeocodingLocation(true);
    setGeocodeError(null);

    try {
      const result = await geocodeLocation(locationText);
      if (result) {
        geolocation.setManualLocation(result.latitude, result.longitude);
      } else {
        setGeocodeError('Location not found. Please try a more specific location.');
      }
    } catch {
      setGeocodeError('Failed to look up location. Please try again.');
    } finally {
      setIsGeocodingLocation(false);
    }
  };

  return {
    ...geolocation,
    isGeocodingLocation,
    geocodeError,
    handleUseLocationText,
  };
};
