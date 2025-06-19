import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../styles/ThemeProvider';
import { lightTheme } from '../../styles/theme';
import { Badge } from './Badge';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

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
    renderWithTheme(<Badge dot data-testid='dot-badge' />);
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
      'danger',
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

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLSpanElement>();
    renderWithTheme(<Badge ref={ref}>Badge with ref</Badge>);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current?.textContent).toBe('Badge with ref');
  });

  it('passes through HTML attributes', () => {
    renderWithTheme(
      <Badge id='badge-id' className='custom-class' title='Badge title'>
        Badge with attributes
      </Badge>
    );

    const badge = screen.getByText('Badge with attributes');
    expect(badge).toHaveAttribute('id', 'badge-id');
    expect(badge).toHaveAttribute('title', 'Badge title');
    expect(badge).toHaveClass('custom-class');
  });

  it('renders empty badge when no children provided', () => {
    renderWithTheme(<Badge data-testid='empty-badge' />);
    const badge = screen.getByTestId('empty-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('');
  });

  it('combines dot and different sizes correctly', () => {
    renderWithTheme(<Badge dot size='sm' data-testid='small-dot' />);
    const badge = screen.getByTestId('small-dot');
    expect(badge).toBeInTheDocument();
  });
});
