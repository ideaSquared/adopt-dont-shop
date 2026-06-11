import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import { ItsAMatchModal } from './ItsAMatchModal';

describe('ItsAMatchModal', () => {
  const baseProps = {
    isOpen: true,
    petName: 'Biscuit',
    petImageUrl: 'https://cdn.example.com/biscuit.jpg',
    conversationHref: '/chat?applicationId=app-1',
    onClose: vi.fn(),
  };

  it('shows the pet name and photo when open', () => {
    render(<ItsAMatchModal {...baseProps} />);
    expect(screen.getByText("It's a Match!")).toBeInTheDocument();
    expect(screen.getByText('Biscuit')).toBeInTheDocument();
    const photo = screen.getByAltText('Biscuit');
    expect(photo).toHaveAttribute('src', 'https://cdn.example.com/biscuit.jpg');
  });

  it('falls back to an initial-only placeholder when no photo is available', () => {
    render(<ItsAMatchModal {...baseProps} petImageUrl={undefined} />);
    expect(screen.queryByAltText('Biscuit')).toBeNull();
    // The placeholder shows the first letter of the pet's name.
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders an "Open conversation" CTA pointing at the supplied href', () => {
    render(<ItsAMatchModal {...baseProps} />);
    const cta = screen.getByTestId('its-a-match-cta');
    expect(cta).toHaveTextContent('Open conversation');
    expect(cta).toHaveAttribute('href', '/chat?applicationId=app-1');
  });

  it('invokes onClose when the user taps the CTA', async () => {
    const onClose = vi.fn();
    render(<ItsAMatchModal {...baseProps} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('its-a-match-cta'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when the user taps "Maybe later"', async () => {
    const onClose = vi.fn();
    render(<ItsAMatchModal {...baseProps} onClose={onClose} />);
    await userEvent.click(screen.getByText('Maybe later'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
