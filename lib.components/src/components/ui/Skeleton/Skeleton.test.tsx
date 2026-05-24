import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { Skeleton, SkeletonText, SkeletonTableRow, SkeletonCard } from './Skeleton';

describe('Skeleton primitives', () => {
  describe('Skeleton', () => {
    it('renders a hidden placeholder element', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveAttribute('aria-hidden', 'true');
    });

    it('applies custom width and height', () => {
      const { container } = render(<Skeleton width='200px' height='2rem' />);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveStyle({ width: '200px', height: '2rem' });
    });

    it('defaults to full width and 1rem height', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveStyle({ width: '100%', height: '1rem' });
    });

    it('accepts custom className', () => {
      const { container } = render(<Skeleton className='custom' />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('custom');
    });
  });

  describe('SkeletonText', () => {
    it('renders the requested number of lines', () => {
      const { container } = render(<SkeletonText lines={5} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('aria-hidden', 'true');
      expect(wrapper.children).toHaveLength(5);
    });

    it('defaults to 3 lines', () => {
      const { container } = render(<SkeletonText />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children).toHaveLength(3);
    });

    it('sets the last line to a shorter width', () => {
      const { container } = render(<SkeletonText lines={2} lastLineWidth='40%' />);
      const wrapper = container.firstChild as HTMLElement;
      const lastLine = wrapper.children[1] as HTMLElement;
      expect(lastLine).toHaveStyle({ width: '40%' });
    });
  });

  describe('SkeletonTableRow', () => {
    it('renders a table row with the specified column count', () => {
      const { container } = render(
        <table>
          <tbody>
            <SkeletonTableRow columnCount={3} />
          </tbody>
        </table>
      );
      const row = screen.getByTestId('skeleton-row');
      expect(row).toHaveAttribute('aria-hidden', 'true');
      expect(row.querySelectorAll('td')).toHaveLength(3);
    });

    it('adds a checkbox cell when hasCheckbox is true', () => {
      render(
        <table>
          <tbody>
            <SkeletonTableRow columnCount={2} hasCheckbox />
          </tbody>
        </table>
      );
      const row = screen.getByTestId('skeleton-row');
      expect(row.querySelectorAll('td')).toHaveLength(3);
    });
  });

  describe('SkeletonCard', () => {
    it('renders a card with text lines', () => {
      const { container } = render(<SkeletonCard lines={4} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-hidden', 'true');
      const textWrapper = card.firstChild as HTMLElement;
      expect(textWrapper.children).toHaveLength(4);
    });

    it('shows an avatar row when showAvatar is true', () => {
      const { container } = render(<SkeletonCard showAvatar />);
      const card = container.firstChild as HTMLElement;
      expect(card.children).toHaveLength(2);
    });

    it('hides avatar row by default', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstChild as HTMLElement;
      expect(card.children).toHaveLength(1);
    });
  });
});
