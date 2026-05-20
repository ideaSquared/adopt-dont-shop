import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as styles from './ProgressiveImage.css';

export type ProgressiveImageProps = {
  src: string;
  alt: string;
  /** Optional WebP variant URL. When provided, served via <picture> to browsers that support it. */
  webpSrc?: string;
  /** When true, image fetch starts immediately. When false, waits until element scrolls into view. */
  eager?: boolean;
  /** Margin around the viewport used by IntersectionObserver. Defaults to '200px'. */
  rootMargin?: string;
  className?: string;
  draggable?: boolean;
  /** Renders behind the image while loading or on failure. */
  placeholder?: React.ReactNode;
  /** Renders in place of the placeholder when the image fails to load. */
  errorFallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
};

const isIntersectionObserverSupported = () =>
  typeof window !== 'undefined' && typeof window.IntersectionObserver !== 'undefined';

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  webpSrc,
  eager = false,
  rootMargin = '200px',
  className,
  draggable = false,
  placeholder,
  errorFallback,
  onLoad,
  onError,
}) => {
  const [shouldLoad, setShouldLoad] = useState<boolean>(
    eager || !isIntersectionObserverSupported()
  );
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setShouldLoad(eager || !isIntersectionObserverSupported());
  }, [src, eager]);

  useEffect(() => {
    if (shouldLoad || !wrapperRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [shouldLoad, rootMargin]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setErrored(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setLoaded(false);
    setErrored(true);
    onError?.();
  }, [onError]);

  const showPlaceholder = !loaded && !errored;
  const showErrorFallback = errored;

  return (
    <div ref={wrapperRef} className={`${styles.wrapper}${className ? ` ${className}` : ''}`}>
      {shouldLoad &&
        (webpSrc ? (
          <picture>
            <source type='image/webp' srcSet={webpSrc} />
            <img
              src={src}
              alt={alt}
              draggable={draggable}
              loading={eager ? 'eager' : 'lazy'}
              decoding='async'
              onLoad={handleLoad}
              onError={handleError}
              className={styles.image({ visible: loaded && !errored })}
            />
          </picture>
        ) : (
          <img
            src={src}
            alt={alt}
            draggable={draggable}
            loading={eager ? 'eager' : 'lazy'}
            decoding='async'
            onLoad={handleLoad}
            onError={handleError}
            className={styles.image({ visible: loaded && !errored })}
          />
        ))}

      {showPlaceholder && placeholder !== undefined && (
        <div className={styles.placeholderLayer} aria-hidden='true'>
          {placeholder}
        </div>
      )}

      {showErrorFallback && errorFallback !== undefined && (
        <div className={styles.placeholderLayer}>{errorFallback}</div>
      )}
    </div>
  );
};
