# ImageGallery Component

An image gallery component with lightbox functionality, thumbnails, and navigation controls.

## Usage

```tsx
import { ImageGallery } from '@/components/ui/ImageGallery'

// Basic usage
<ImageGallery images={imageArray} />

// With custom configuration
<ImageGallery
  images={imageArray}
  showThumbnails={true}
  autoPlay={false}
  className="custom-gallery"
/>
```

## Props

- `images`: Array of image objects with src and alt
- `showThumbnails`: Whether to display thumbnail navigation
- `autoPlay`: Whether to auto-advance images
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Lightbox modal view
- Thumbnail navigation
- Keyboard controls
- Touch/swipe support
- Lazy loading
- Accessible markup
- TypeScript support
