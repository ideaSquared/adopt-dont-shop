import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import noImage from '../ImageGallery/no-image.png';
import { PetImage } from './PetImage';

describe('PetImage', () => {
  describe('when a valid image URL is provided', () => {
    it('displays the image with the correct alt text', () => {
      render(<PetImage src='https://example.com/cat.jpg' alt='Whiskers' eager />);
      // getByRole (hidden: false by default) excludes the placeholder inside aria-hidden
      expect(screen.getByRole('img', { name: 'Whiskers' })).toBeInTheDocument();
    });

    it('uses the provided URL as the image source', () => {
      render(<PetImage src='https://example.com/cat.jpg' alt='Whiskers' eager />);
      const img = screen.getByRole('img', { name: 'Whiskers' }) as HTMLImageElement;
      expect(img.src).toContain('cat.jpg');
    });

    it('shows the no-image fallback when the image fails to load', () => {
      render(<PetImage src='https://example.com/broken.jpg' alt='Broken pet' eager />);
      // Before error: only the main img is accessible (placeholder is aria-hidden)
      const mainImg = screen.getByRole('img', { name: 'Broken pet' }) as HTMLImageElement;
      fireEvent.error(mainImg);
      // After error: errorFallback (no-image) replaces the aria-hidden placeholder
      const allImgs = screen.getAllByRole('img', { name: 'Broken pet' }) as HTMLImageElement[];
      expect(allImgs.some(img => img.getAttribute('src') === noImage)).toBe(true);
    });
  });

  describe('when no image URL is provided', () => {
    it('renders the no-image fallback when src is undefined', () => {
      render(<PetImage src={undefined} alt='No photo' />);
      const img = screen.getByAltText('No photo') as HTMLImageElement;
      expect(img).toHaveAttribute('src', noImage);
    });

    it('renders the no-image fallback when src is an empty string', () => {
      render(<PetImage src='' alt='No photo' />);
      const img = screen.getByAltText('No photo') as HTMLImageElement;
      expect(img).toHaveAttribute('src', noImage);
    });
  });
});
