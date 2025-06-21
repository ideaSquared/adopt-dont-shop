# Performance Guidelines

## Core Web Vitals Targets

- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1

## Loading Optimizations

- Implement code splitting using dynamic imports
- Use lazy loading with React.lazy and Suspense
- Prioritize critical CSS and defer non-critical styles
- Optimize bundle size with tree-shaking and minification
- Implement route-based chunking strategies

## Image Handling

- Use modern image formats (WebP/AVIF) with fallbacks
- Implement responsive images with srcset and sizes attributes
- Add loading="lazy" for below-the-fold images
- Optimize images at build time
- Use CDNs for large media assets

## Caching Strategies

- Implement service workers for offline capabilities
- Set appropriate caching headers
- Use memory caching for frequent operations
- Implement client-side cache management
- Consider stale-while-revalidate pattern for API responses

## Component Optimization

- Memoize expensive computations with useMemo
- Prevent unnecessary renders with React.memo
- Use useCallback for event handlers passed to child components
- Virtualize long lists and large datasets
- Implement windowing techniques for long scrollable content
