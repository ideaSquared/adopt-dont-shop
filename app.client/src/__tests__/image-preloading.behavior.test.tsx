/**
 * Behavioural tests for image preloading and progressive loading in the
 * swipe-to-adopt flow.
 *
 * Acceptance criteria covered:
 *   - Upcoming swipe cards have their primary image preloaded
 *   - The currently visible card renders its image (no blank flash)
 *   - Failed image loads show a graceful fallback
 *   - Off-screen / not-yet-visible images are not eagerly fetched
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test-utils';

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({
    logEvent: vi.fn(),
    checkGate: () => false,
    client: null,
    getExperiment: () => null,
    getDynamicConfig: () => null,
  }),
}));

import { SwipeStack } from '../components/swipe/SwipeStack';
import type { DiscoveryPet } from '../services';

const buildPet = (overrides: Partial<DiscoveryPet> & { petId: string }): DiscoveryPet => ({
  petId: overrides.petId,
  name: `Pet ${overrides.petId}`,
  type: 'dog',
  breed: 'Mixed',
  ageGroup: 'adult',
  size: 'medium',
  gender: 'male',
  images: [`https://cdn.example/${overrides.petId}.jpg`],
  rescueName: 'Test Rescue',
  ...overrides,
});

describe('Swipe image preloading behaviour', () => {
  let constructedImageSrcs: string[];
  let originalImage: typeof Image;

  beforeEach(() => {
    constructedImageSrcs = [];
    originalImage = global.Image;
    // Track every Image() instance created so we can assert preload requests.
    class TrackingImage {
      onload: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      decoding = 'auto';
      private _src = '';
      get src(): string {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        constructedImageSrcs.push(value);
      }
    }
    global.Image = TrackingImage as unknown as typeof Image;
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  it('preloads images for the cards just past the visible window', () => {
    const pets = [
      buildPet({ petId: 'a' }),
      buildPet({ petId: 'b' }),
      buildPet({ petId: 'c' }),
      buildPet({ petId: 'd' }), // first preload candidate (n+1)
      buildPet({ petId: 'e' }),
      buildPet({ petId: 'f' }),
      buildPet({ petId: 'g' }),
      buildPet({ petId: 'h' }), // last preload candidate (n+5)
      buildPet({ petId: 'i' }), // should not preload yet
    ];

    renderWithProviders(
      <SwipeStack pets={pets} onSwipe={vi.fn()} onEndReached={vi.fn()} sessionId='session-1' />
    );

    expect(constructedImageSrcs).toContain('https://cdn.example/d.jpg');
    expect(constructedImageSrcs).toContain('https://cdn.example/h.jpg');
    expect(constructedImageSrcs).not.toContain('https://cdn.example/i.jpg');
  });

  it('does not preload when there are no upcoming cards beyond the visible window', () => {
    const pets = [buildPet({ petId: 'a' }), buildPet({ petId: 'b' })];

    renderWithProviders(
      <SwipeStack pets={pets} onSwipe={vi.fn()} onEndReached={vi.fn()} sessionId='session-1' />
    );

    expect(constructedImageSrcs).toEqual([]);
  });

  it('skips preload for pets without an image', () => {
    const pets = [
      buildPet({ petId: 'a' }),
      buildPet({ petId: 'b' }),
      buildPet({ petId: 'c' }),
      buildPet({ petId: 'no-image', images: [] }),
      buildPet({ petId: 'e' }),
    ];

    renderWithProviders(
      <SwipeStack pets={pets} onSwipe={vi.fn()} onEndReached={vi.fn()} sessionId='session-1' />
    );

    expect(constructedImageSrcs).not.toContain('');
    expect(constructedImageSrcs).toContain('https://cdn.example/e.jpg');
  });
});

describe('Swipe card progressive loading behaviour', () => {
  it('renders a placeholder for the visible card while the image is loading', () => {
    const pets = [buildPet({ petId: 'a', name: 'Buddy' })];

    renderWithProviders(
      <SwipeStack pets={pets} onSwipe={vi.fn()} onEndReached={vi.fn()} sessionId='session-1' />
    );

    // Placeholder text should be present until the image loads.
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows an error fallback when the visible card image fails to load', () => {
    const pets = [buildPet({ petId: 'a', name: 'Buddy', breed: 'Labrador' })];

    renderWithProviders(
      <SwipeStack pets={pets} onSwipe={vi.fn()} onEndReached={vi.fn()} sessionId='session-1' />
    );

    const img = screen.getByAltText('Buddy - Labrador');
    fireEvent.error(img);

    expect(screen.getByLabelText('Buddy image unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('marks the top card image as eager and stacked cards as lazy', () => {
    const pets = [
      buildPet({ petId: 'a', name: 'Buddy', breed: 'Labrador' }),
      buildPet({ petId: 'b', name: 'Max', breed: 'Husky' }),
    ];

    renderWithProviders(
      <SwipeStack pets={pets} onSwipe={vi.fn()} onEndReached={vi.fn()} sessionId='session-1' />
    );

    const topImg = screen.getByAltText('Buddy - Labrador') as HTMLImageElement;
    const stackedImg = screen.getByAltText('Max - Husky') as HTMLImageElement;

    expect(topImg.getAttribute('loading')).toBe('eager');
    expect(stackedImg.getAttribute('loading')).toBe('lazy');
  });
});
