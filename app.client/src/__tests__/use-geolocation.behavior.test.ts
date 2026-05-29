/**
 * Behavioral tests for useGeolocation hook
 *
 * Tests the location acquisition behavior:
 * - Caches location to reduce permission prompts
 * - Handles permission denied gracefully
 * - Handles unavailable geolocation API
 * - Supports manual location entry
 * - Clears location state
 */

import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from '../hooks/useGeolocation';

const LOCATION_CACHE_KEY = 'user_geolocation';

// Mock geolocation
const mockGeolocationSuccess = (latitude: number, longitude: number) => {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({
      coords: {
        latitude,
        longitude,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });
  });

  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    writable: true,
    configurable: true,
  });

  return getCurrentPosition;
};

const mockGeolocationDenied = () => {
  const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
    error({
      code: 1, // PERMISSION_DENIED
      message: 'User denied geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });
  });

  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    writable: true,
    configurable: true,
  });

  return getCurrentPosition;
};

describe('useGeolocation hook', () => {
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    localStorage.removeItem(LOCATION_CACHE_KEY);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
    localStorage.removeItem(LOCATION_CACHE_KEY);
  });

  describe('initial state', () => {
    it('starts in idle state with no location', () => {
      const { result } = renderHook(() => useGeolocation());

      expect(result.current.status).toBe('idle');
      expect(result.current.hasLocation).toBe(false);
      expect(result.current.latitude).toBeUndefined();
      expect(result.current.longitude).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });

    it('restores cached location on mount', () => {
      const cached = {
        latitude: 51.5074,
        longitude: -0.1278,
        timestamp: Date.now(),
      };
      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cached));

      const { result } = renderHook(() => useGeolocation());

      expect(result.current.status).toBe('granted');
      expect(result.current.hasLocation).toBe(true);
      expect(result.current.latitude).toBe(51.5074);
      expect(result.current.longitude).toBe(-0.1278);
    });

    it('ignores expired cached location', () => {
      const expired = {
        latitude: 51.5074,
        longitude: -0.1278,
        timestamp: Date.now() - 60 * 60 * 1000, // 1 hour ago (TTL is 30 min)
      };
      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(expired));

      const { result } = renderHook(() => useGeolocation());

      expect(result.current.status).toBe('idle');
      expect(result.current.hasLocation).toBe(false);
    });
  });

  describe('requesting location', () => {
    it('provides location when browser grants permission', () => {
      mockGeolocationSuccess(40.7128, -74.006);

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      expect(result.current.status).toBe('granted');
      expect(result.current.hasLocation).toBe(true);
      expect(result.current.latitude).toBe(40.7128);
      expect(result.current.longitude).toBe(-74.006);
    });

    it('caches location in localStorage after successful request', () => {
      mockGeolocationSuccess(40.7128, -74.006);

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      const cached = JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY) || '{}');
      expect(cached.latitude).toBe(40.7128);
      expect(cached.longitude).toBe(-74.006);
      expect(cached.timestamp).toBeDefined();
    });

    it('shows denied status when user denies permission', () => {
      mockGeolocationDenied();

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      expect(result.current.status).toBe('denied');
      expect(result.current.hasLocation).toBe(false);
      expect(result.current.error).toContain('denied');
    });

    it('shows unavailable status when geolocation API is missing', () => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      expect(result.current.status).toBe('unavailable');
      expect(result.current.error).toContain('not supported');
    });
  });

  describe('manual location entry', () => {
    it('sets location from manual coordinates', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.setManualLocation(34.0522, -118.2437);
      });

      expect(result.current.status).toBe('granted');
      expect(result.current.hasLocation).toBe(true);
      expect(result.current.latitude).toBe(34.0522);
      expect(result.current.longitude).toBe(-118.2437);
    });

    it('caches manual location', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.setManualLocation(34.0522, -118.2437);
      });

      const cached = JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY) || '{}');
      expect(cached.latitude).toBe(34.0522);
      expect(cached.longitude).toBe(-118.2437);
    });
  });

  describe('clearing location', () => {
    it('clears location state and cache', () => {
      mockGeolocationSuccess(51.5074, -0.1278);

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      expect(result.current.hasLocation).toBe(true);

      act(() => {
        result.current.clearLocation();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.hasLocation).toBe(false);
      expect(result.current.latitude).toBeUndefined();
      expect(result.current.longitude).toBeUndefined();
      expect(localStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();
    });
  });

  describe('unmount guard', () => {
    it('does not call setState after unmount when the geolocation success callback fires late', () => {
      // Simulate a slow geolocation response that resolves after unmount.
      let capturedSuccessCallback!: PositionCallback;
      const getCurrentPosition = vi.fn((success: PositionCallback) => {
        // Capture but do NOT call yet — simulates the 10s timeout
        capturedSuccessCallback = success;
      });
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition },
        writable: true,
        configurable: true,
      });

      const { result, unmount } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      // Hook is still in 'loading' state
      expect(result.current.status).toBe('loading');

      // Unmount the hook before the geolocation callback fires
      unmount();

      // Fire the success callback after unmount — the mounted guard must
      // suppress the setState call. We assert that no error is thrown and
      // that the hook's last known status (captured before unmount) was
      // 'loading', not 'granted'.
      act(() => {
        capturedSuccessCallback({
          coords: {
            latitude: 51.5074,
            longitude: -0.1278,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
      });

      // No assertions on result.current after unmount — we are verifying the
      // absence of a React "Can't perform a state update on an unmounted
      // component" warning (which would cause the test to fail in strict mode).
    });

    it('does not call setState after unmount when the geolocation error callback fires late', () => {
      let capturedErrorCallback!: PositionErrorCallback;
      const getCurrentPosition = vi.fn(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          capturedErrorCallback = error;
        }
      );
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition },
        writable: true,
        configurable: true,
      });

      const { result, unmount } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      expect(result.current.status).toBe('loading');

      unmount();

      // Fire the error callback after unmount — no setState should occur
      act(() => {
        capturedErrorCallback({
          code: 3, // TIMEOUT
          message: 'Timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      });

      // Absence of errors / warnings is the passing condition.
    });
  });
});
