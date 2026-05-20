import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ProgressiveImage } from './ProgressiveImage';

describe('ProgressiveImage', () => {
  describe('eager loading', () => {
    it('renders the image immediately when eager is true', () => {
      render(<ProgressiveImage src='https://cdn.example/cat.jpg' alt='A cat' eager />);

      const img = screen.getByAltText('A cat') as HTMLImageElement;
      expect(img.src).toContain('cat.jpg');
      expect(img.getAttribute('loading')).toBe('eager');
    });
  });

  describe('lazy loading', () => {
    let originalIO: typeof IntersectionObserver;

    beforeEach(() => {
      originalIO = global.IntersectionObserver;
    });

    afterEach(() => {
      global.IntersectionObserver = originalIO;
    });

    it('does not render the image until intersection occurs', () => {
      const observers: IntersectionObserverCallback[] = [];
      class DeferredObserver {
        constructor(cb: IntersectionObserverCallback) {
          observers.push(cb);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
      }
      global.IntersectionObserver = DeferredObserver as unknown as typeof IntersectionObserver;

      render(<ProgressiveImage src='https://cdn.example/dog.jpg' alt='A dog' />);

      expect(screen.queryByAltText('A dog')).not.toBeInTheDocument();
      expect(observers.length).toBe(1);
    });

    it('loads the image once it scrolls into view', () => {
      const observers: { cb: IntersectionObserverCallback; target?: Element }[] = [];
      class DeferredObserver {
        cb: IntersectionObserverCallback;
        constructor(cb: IntersectionObserverCallback) {
          this.cb = cb;
          observers.push({ cb });
        }
        observe(target: Element) {
          observers[observers.length - 1].target = target;
        }
        unobserve() {}
        disconnect() {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
      }
      global.IntersectionObserver = DeferredObserver as unknown as typeof IntersectionObserver;

      render(<ProgressiveImage src='https://cdn.example/dog.jpg' alt='A dog' />);
      expect(screen.queryByAltText('A dog')).not.toBeInTheDocument();

      const { cb, target } = observers[0];
      act(() => {
        cb(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });

      expect(screen.getByAltText('A dog')).toBeInTheDocument();
    });
  });

  describe('placeholder and error fallback', () => {
    it('shows placeholder until the image loads', () => {
      render(
        <ProgressiveImage
          src='https://cdn.example/cat.jpg'
          alt='A cat'
          eager
          placeholder={<div>Loading cat...</div>}
        />
      );

      expect(screen.getByText('Loading cat...')).toBeInTheDocument();

      fireEvent.load(screen.getByAltText('A cat'));

      expect(screen.queryByText('Loading cat...')).not.toBeInTheDocument();
    });

    it('shows error fallback when image fails to load', () => {
      render(
        <ProgressiveImage
          src='https://cdn.example/broken.jpg'
          alt='A cat'
          eager
          placeholder={<div>Loading...</div>}
          errorFallback={<div>Image unavailable</div>}
        />
      );

      fireEvent.error(screen.getByAltText('A cat'));

      expect(screen.getByText('Image unavailable')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('webp support', () => {
    it('emits a <picture> with a webp source when webpSrc is provided', () => {
      const { container } = render(
        <ProgressiveImage
          src='https://cdn.example/cat.jpg'
          webpSrc='https://cdn.example/cat.webp'
          alt='A cat'
          eager
        />
      );

      const source = container.querySelector('source[type="image/webp"]');
      expect(source).not.toBeNull();
      expect(source?.getAttribute('srcset')).toBe('https://cdn.example/cat.webp');
    });

    it('omits the picture element when no webpSrc is provided', () => {
      const { container } = render(
        <ProgressiveImage src='https://cdn.example/cat.jpg' alt='A cat' eager />
      );

      expect(container.querySelector('picture')).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('invokes onLoad when the image fires the load event', () => {
      const onLoad = vi.fn();

      render(
        <ProgressiveImage src='https://cdn.example/cat.jpg' alt='A cat' eager onLoad={onLoad} />
      );

      fireEvent.load(screen.getByAltText('A cat'));
      expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it('invokes onError when the image fires the error event', () => {
      const onError = vi.fn();

      render(
        <ProgressiveImage
          src='https://cdn.example/broken.jpg'
          alt='A cat'
          eager
          onError={onError}
        />
      );

      fireEvent.error(screen.getByAltText('A cat'));
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});
