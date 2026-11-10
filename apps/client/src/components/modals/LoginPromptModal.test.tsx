import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render';
import { LoginPromptModal } from './LoginPromptModal';

describe('LoginPromptModal', () => {
  it('announces itself as a named dialog', () => {
    renderWithProviders(<LoginPromptModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: /join adopt don't shop/i })).toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    renderWithProviders(<LoginPromptModal isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers account creation and sign-in links', () => {
    renderWithProviders(<LoginPromptModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute(
      'href',
      '/register'
    );
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('does not announce a phantom backdrop button', () => {
    renderWithProviders(<LoginPromptModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /close notifications/i })).toBeNull();
  });

  it('closes from the continue browsing button', () => {
    const onClose = vi.fn();
    renderWithProviders(<LoginPromptModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /continue browsing/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the close button', () => {
    const onClose = vi.fn();
    renderWithProviders(<LoginPromptModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn();
    renderWithProviders(<LoginPromptModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
