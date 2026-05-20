import { useEffect, useRef } from 'react';

/**
 * Preloads a list of image URLs by constructing in-memory `Image` instances,
 * causing the browser to fetch them into the HTTP cache. URLs already
 * preloaded in this hook's lifetime are skipped.
 */
export const useImagePreloader = (urls: ReadonlyArray<string | undefined>): void => {
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof Image === 'undefined') {
      return;
    }

    urls.forEach(url => {
      if (!url || preloadedRef.current.has(url)) {
        return;
      }
      preloadedRef.current.add(url);
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    });
  }, [urls]);
};
