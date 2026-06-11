import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNearbySearch } from './useNearbySearch';

vi.mock('./useGeolocation', () => ({
  useGeolocation: vi.fn(),
}));

vi.mock('@/utils/geocoding', () => ({
  geocodeLocation: vi.fn(),
}));

import { useGeolocation } from './useGeolocation';
import { geocodeLocation } from '@/utils/geocoding';

const mockUseGeolocation = vi.mocked(useGeolocation);
const mockGeocodeLocation = vi.mocked(geocodeLocation);

const buildGeoState = (overrides = {}) => ({
  latitude: undefined,
  longitude: undefined,
  status: 'idle' as const,
  error: undefined,
  hasLocation: false,
  requestLocation: vi.fn(),
  setManualLocation: vi.fn(),
  clearLocation: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseGeolocation.mockReturnValue(buildGeoState());
});

describe('useNearbySearch', () => {
  it('exposes the underlying geolocation state and functions', () => {
    const requestLocation = vi.fn();
    const clearLocation = vi.fn();
    mockUseGeolocation.mockReturnValue(
      buildGeoState({
        status: 'granted',
        hasLocation: true,
        latitude: 51.5,
        longitude: -0.1,
        requestLocation,
        clearLocation,
      })
    );

    const { result } = renderHook(() => useNearbySearch());

    expect(result.current.status).toBe('granted');
    expect(result.current.hasLocation).toBe(true);
    expect(result.current.latitude).toBe(51.5);
    expect(result.current.longitude).toBe(-0.1);
    expect(result.current.requestLocation).toBe(requestLocation);
    expect(result.current.clearLocation).toBe(clearLocation);
  });

  it('starts with isGeocodingLocation false and no geocodeError', () => {
    const { result } = renderHook(() => useNearbySearch());

    expect(result.current.isGeocodingLocation).toBe(false);
    expect(result.current.geocodeError).toBeNull();
  });

  it('calls setManualLocation with coordinates when geocoding succeeds', async () => {
    const setManualLocation = vi.fn();
    mockUseGeolocation.mockReturnValue(buildGeoState({ setManualLocation }));
    mockGeocodeLocation.mockResolvedValue({ latitude: 51.5, longitude: -0.1 });

    const { result } = renderHook(() => useNearbySearch());

    await act(async () => {
      await result.current.handleUseLocationText('London');
    });

    expect(mockGeocodeLocation).toHaveBeenCalledWith('London');
    expect(setManualLocation).toHaveBeenCalledWith(51.5, -0.1);
    expect(result.current.geocodeError).toBeNull();
  });

  it('sets geocodeError when geocoder returns null', async () => {
    mockGeocodeLocation.mockResolvedValue(null);

    const { result } = renderHook(() => useNearbySearch());

    await act(async () => {
      await result.current.handleUseLocationText('XYZ999');
    });

    expect(result.current.geocodeError).toBe(
      'Location not found. Please try a more specific location.'
    );
  });

  it('sets geocodeError when geocoder throws', async () => {
    mockGeocodeLocation.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useNearbySearch());

    await act(async () => {
      await result.current.handleUseLocationText('London');
    });

    expect(result.current.geocodeError).toBe('Failed to look up location. Please try again.');
  });

  it('does nothing when locationText is empty', async () => {
    const { result } = renderHook(() => useNearbySearch());

    await act(async () => {
      await result.current.handleUseLocationText('  ');
    });

    expect(mockGeocodeLocation).not.toHaveBeenCalled();
  });
});
