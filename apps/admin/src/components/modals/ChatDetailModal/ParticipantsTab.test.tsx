import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test-utils';
import { ParticipantsTab } from './ParticipantsTab';
import type { Participant } from '@adopt-dont-shop/lib.chat';

const buildParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'user-1',
  name: 'Alice Adopter',
  type: 'user',
  ...overrides,
});

describe('ParticipantsTab', () => {
  it('renders the empty state when there are no participants', () => {
    render(<ParticipantsTab participants={[]} onClose={vi.fn()} />);
    expect(screen.getByText('No participants found')).toBeInTheDocument();
  });

  it('renders the participant name as a link to the user detail route', () => {
    render(
      <ParticipantsTab participants={[buildParticipant({ id: 'user-42' })]} onClose={vi.fn()} />
    );
    const link = screen.getByRole('link', { name: 'Alice Adopter' });
    expect(link).toHaveAttribute('href', '/users/user-42');
  });

  it('calls onClose when a participant link is clicked so the modal closes before navigating', () => {
    const onClose = vi.fn();
    render(<ParticipantsTab participants={[buildParticipant()]} onClose={onClose} />);

    fireEvent.click(screen.getByRole('link', { name: 'Alice Adopter' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to plain text when the participant has no id', () => {
    render(
      <ParticipantsTab
        participants={[buildParticipant({ id: '', name: 'Anonymous' })]}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole('link', { name: 'Anonymous' })).not.toBeInTheDocument();
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });
});
