import { useCallback, useEffect, useState } from 'react';

const LOCATION_CACHE_KEY = 'user_geolocation';
const LOCATION_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

type GeolocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable' | 'error';

type GeolocationState = {
  latitude: number | undefined;
  longitude: number | undefined;
  status: GeolocationStatus;
  error: string | undefined;
};

type CachedLocation = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

const loadCachedLocation = (): CachedLocation | null => {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) {
      return null;
    }
    const parsed: CachedLocation = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    if (age > LOCATION_CACHE_TTL_MS) {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveCachedLocation = (latitude: number, longitude: number): void => {
  try {
    const entry: CachedLocation = { latitude, longitude, timestamp: Date.now() };
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable
  }
};

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>(() => {
    const cached = loadCachedLocation();
    if (cached) {
      return {
        latitude: cached.latitude,
        longitude: cached.longitude,
        status: 'granted' as const,
        error: undefined,
      };
    }
    return {
      latitude: undefined,
      longitude: undefined,
      status: 'idle' as const,
      error: undefined,
    };
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        status: 'unavailable',
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    setState(prev => ({ ...prev, status: 'loading', error: undefined }));

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        saveCachedLocation(latitude, longitude);
        setState({
          latitude,
          longitude,
          status: 'granted',
          error: undefined,
        });
      },
      err => {
        const errorMessage =
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. You can enter your location manually.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Location information is unavailable.'
              : 'Location request timed out.';

        const status: GeolocationStatus = err.code === err.PERMISSION_DENIED ? 'denied' : 'error';

        setState(prev => ({
          ...prev,
          status,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: LOCATION_CACHE_TTL_MS,
      }
    );
  }, []);

  const setManualLocation = useCallback((latitude: number, longitude: number) => {
    saveCachedLocation(latitude, longitude);
    setState({
      latitude,
      longitude,
      status: 'granted',
      error: undefined,
    });
  }, []);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(LOCATION_CACHE_KEY);
    setState({
      latitude: undefined,
      longitude: undefined,
      status: 'idle',
      error: undefined,
    });
  }, []);

  // Try to load from cache on mount
  useEffect(() => {
    const cached = loadCachedLocation();
    if (cached && state.status === 'idle') {
      setState({
        latitude: cached.latitude,
        longitude: cached.longitude,
        status: 'granted',
        error: undefined,
      });
    }
  }, []);

  return {
    ...state,
    hasLocation: state.latitude !== undefined && state.longitude !== undefined,
    requestLocation,
    setManualLocation,
    clearLocation,
  };
};
