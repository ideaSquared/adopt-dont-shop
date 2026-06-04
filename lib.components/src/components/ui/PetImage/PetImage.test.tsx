import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { PetImage } from './PetImage';

describe('PetImage', () => {
  describe('when no src is provided', () => {
    it('renders an image with the correct alt text immediately', () => {
      render(<PetImage alt='A cat' />);
      expect(screen.getByRole('img', { name: 'A cat' })).toBeInTheDocument();
    });

    it('passes className to the fallback image', () => {
      render(<PetImage alt='A cat' className='custom-class' />);
      expect(screen.getByRole('img', { name: 'A cat' })).toHaveClass('custom-class');
    });

    it('shows a no-image asset (src ends with no-image.png)', () => {
      render(<PetImage alt='A cat' />);
      const img = screen.getByRole('img', { name: 'A cat' });
      expect(img.getAttribute('src')).toMatch(/no-image\.png/);
    });
  });

  describe('when src is provided', () => {
    it('renders the image with the given src', () => {
      render(<PetImage src='https://cdn.example/pet.jpg' alt='Buddy' eager />);
      expect(screen.getByRole('img', { name: 'Buddy' })).toHaveAttribute(
        'src',
        'https://cdn.example/pet.jpg'
      );
    });

    it('shows a no-image fallback when the image fails to load', () => {
      render(<PetImage src='https://cdn.example/broken.jpg' alt='Buddy' eager />);

      // The original img is in the DOM — fire error on it
      fireEvent.error(screen.getByRole('img', { name: 'Buddy' }));

      // After error, a second img (the no-image fallback) should be present
      const images = screen.getAllByRole('img', { name: 'Buddy' });
      const fallback = images.find(img => img.getAttribute('src')?.match(/no-image\.png/));
      expect(fallback).toBeInTheDocument();
    });
  });
});
