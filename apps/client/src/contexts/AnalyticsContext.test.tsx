/**
 * Behavioural tests for AnalyticsContext.
 *
 * The provider wires a single AnalyticsService instance into the tree and
 * exposes trackEvent / trackPageView helpers. We verify those helpers forward
 * to the service (including the page-title fallback to document.title) and that
 * the hook guards against use outside the provider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

const trackEvent = vi.fn();
const trackPageView = vi.fn();
const constructorArgs = vi.hoisted(() => ({ calls: [] as unknown[][] }));
const sharedApiService = vi.hoisted(() => ({ name: 'shared-api-service' }));

vi.mock('@/services/libraryServices', () => ({ apiService: sharedApiService }));

vi.mock('@adopt-dont-shop/lib.analytics', () => ({
  AnalyticsService: class {
    constructor(...args: unknown[]) {
      constructorArgs.calls.push(args);
    }
    trackEvent = trackEvent;
    trackPageView = trackPageView;
  },
}));

import { AnalyticsProvider, useAnalytics } from './AnalyticsContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AnalyticsProvider>{children}</AnalyticsProvider>
);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AnalyticsContext', () => {
  it('builds the analytics service on the shared apiService', () => {
    constructorArgs.calls.length = 0;
    renderHook(() => useAnalytics(), { wrapper });

    expect(constructorArgs.calls[0]?.[1]).toBe(sharedApiService);
  });

  it('forwards trackEvent to the analytics service', () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    const event = { event: 'pet_viewed', userId: 'u-1' } as Parameters<
      typeof result.current.trackEvent
    >[0];
    result.current.trackEvent(event);

    expect(trackEvent).toHaveBeenCalledWith(event);
  });

  it('forwards trackPageView with the supplied title', () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    result.current.trackPageView('/pets', 'Pets');

    expect(trackPageView).toHaveBeenCalledWith({ url: '/pets', title: 'Pets' });
  });

  it('falls back to document.title when no title is given', () => {
    document.title = "Adopt Don't Shop";
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    result.current.trackPageView('/home');

    expect(trackPageView).toHaveBeenCalledWith({ url: '/home', title: "Adopt Don't Shop" });
  });

  it('exposes the analytics service instance', () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    expect(result.current.analyticsService).toBeDefined();
  });

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useAnalytics())).toThrow(/must be used within AnalyticsProvider/);
  });
});
