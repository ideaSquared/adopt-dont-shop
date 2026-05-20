import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders without crashing', () => {
    render(<Logo />);
    expect(screen.getByRole('img', { name: 'AdoptDontShop' })).toBeInTheDocument();
  });

  it('uses the detailed mark when size is 48 or above', () => {
    render(<Logo size={48} data-testid='logo' />);
    const svg = document.querySelector('[data-mark="detailed"]');
    expect(svg).toBeInTheDocument();
  });

  it('uses the simple mark when size is below 48', () => {
    render(<Logo size={32} data-testid='logo' />);
    const svg = document.querySelector('[data-mark="simple"]');
    expect(svg).toBeInTheDocument();
  });

  it('uses the simple mark by default', () => {
    render(<Logo />);
    const svg = document.querySelector('[data-mark="simple"]');
    expect(svg).toBeInTheDocument();
  });

  it('does not show wordmark by default', () => {
    render(<Logo />);
    expect(screen.queryByText(/Adopt/)).not.toBeInTheDocument();
  });

  it('shows wordmark when showWordmark is true', () => {
    render(<Logo showWordmark />);
    expect(screen.getByText('Adopt')).toBeInTheDocument();
    expect(screen.getByText('DontShop')).toBeInTheDocument();
  });

  it('applies dark background class when darkBg is true', () => {
    render(<Logo showWordmark darkBg data-testid='logo-lockup' />);
    const wordmark = document.querySelector('[data-wordmark]');
    expect(wordmark).toHaveAttribute('data-dark', 'true');
  });

  it('accepts a custom className', () => {
    const { container } = render(<Logo className='my-logo' />);
    expect(container.firstChild).toHaveClass('my-logo');
  });
});
