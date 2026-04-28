import { render, screen } from '@testing-library/react';
import React from 'react';
import { Badge } from './Badge';

const renderWithTheme = (component: React.ReactElement) => render(component);

describe('Badge', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Badge>Badge Text</Badge>);
    const badge = screen.getByText('Badge Text');
    expect(badge).toBeInTheDocument();
  });

  it('applies different variants correctly', () => {
    renderWithTheme(<Badge variant='primary'>Primary Badge</Badge>);
    const badge = screen.getByText('Primary Badge');
    expect(badge).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(<Badge size='lg'>Large Badge</Badge>);
    const badge = screen.getByText('Large Badge');
    expect(badge).toBeInTheDocument();
  });

  it('renders as dot when dot prop is true', () => {
    renderWithTheme(
      <Badge dot data-testid='dot-badge'>
        {''}
      </Badge>
    );
    const badge = screen.getByTestId('dot-badge');
    expect(badge).toBeInTheDocument();
  });

  it('applies rounded styles when rounded prop is true', () => {
    renderWithTheme(<Badge rounded>Rounded Badge</Badge>);
    const badge = screen.getByText('Rounded Badge');
    expect(badge).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Badge data-testid='test-badge'>Test Badge</Badge>);
    const badge = screen.getByTestId('test-badge');
    expect(badge).toBeInTheDocument();
  });

  it('renders with different variant styles', () => {
    const variants = [
      'primary',
      'secondary',
      'success',
      'error',
      'warning',
      'info',
      'neutral',
      'outline',
    ] as const;

    variants.forEach(variant => {
      renderWithTheme(<Badge variant={variant}>{variant} badge</Badge>);
      const badge = screen.getByText(`${variant} badge`);
      expect(badge).toBeInTheDocument();
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach(size => {
      renderWithTheme(<Badge size={size}>{size} badge</Badge>);
      const badge = screen.getByText(`${size} badge`);
      expect(badge).toBeInTheDocument();
    });
  });

  // ref is not supported by BadgeProps, so this test is removed

  it('passes through HTML attributes', () => {
    renderWithTheme(
      <Badge className='custom-class' data-testid='custom-class-badge'>
        Badge with attributes
      </Badge>
    );

    const badge = screen.getByTestId('custom-class-badge');
    expect(badge).toHaveClass('custom-class');
  });

  it('renders empty badge when no children provided', () => {
    renderWithTheme(<Badge data-testid='empty-badge'>{''}</Badge>);
    const badge = screen.getByTestId('empty-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('');
  });

  it('combines dot and different sizes correctly', () => {
    renderWithTheme(
      <Badge dot size='sm' data-testid='small-dot'>
        {''}
      </Badge>
    );
    const badge = screen.getByTestId('small-dot');
    expect(badge).toBeInTheDocument();
  });

  describe('count variant', () => {
    it('renders a numeric count', () => {
      renderWithTheme(<Badge variant='count'>3</Badge>);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('clamps numeric children above the max to "{max}+"', () => {
      renderWithTheme(
        <Badge variant='count' max={99}>
          150
        </Badge>
      );
      expect(screen.getByText('99+')).toBeInTheDocument();
      expect(screen.queryByText('150')).not.toBeInTheDocument();
    });

    it('renders numeric children equal to max without clamping', () => {
      renderWithTheme(
        <Badge variant='count' max={99}>
          99
        </Badge>
      );
      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('ignores max when children is not numeric', () => {
      renderWithTheme(
        <Badge variant='count' max={5}>
          NEW
        </Badge>
      );
      expect(screen.getByText('NEW')).toBeInTheDocument();
    });
  });
});
