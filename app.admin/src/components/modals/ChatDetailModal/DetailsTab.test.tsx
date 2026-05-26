import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test-utils';
import { DetailsTab } from './DetailsTab';
import type { Conversation } from '@adopt-dont-shop/lib.chat';

const buildConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'chat-1',
  participants: [],
  unreadCount: 0,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  isActive: true,
  status: 'active',
  ...overrides,
});

const noopBadge = () => null;

describe('DetailsTab', () => {
  it('renders the rescue name as a link to the rescue detail route', () => {
    render(
      <DetailsTab
        conversation={buildConversation({ rescueId: 'rescue-7', rescueName: 'Happy Paws' })}
        getStatusBadge={noopBadge}
        onClose={vi.fn()}
      />
    );
    const link = screen.getByRole('link', { name: 'Happy Paws' });
    expect(link).toHaveAttribute('href', '/rescues/rescue-7');
  });

  it('renders the pet id as a link to the pet detail route', () => {
    render(
      <DetailsTab
        conversation={buildConversation({ petId: 'pet-9' })}
        getStatusBadge={noopBadge}
        onClose={vi.fn()}
      />
    );
    const link = screen.getByRole('link', { name: 'pet-9' });
    expect(link).toHaveAttribute('href', '/pets/pet-9');
  });

  it('calls onClose when the rescue link is clicked', () => {
    const onClose = vi.fn();
    render(
      <DetailsTab
        conversation={buildConversation({ rescueId: 'rescue-7', rescueName: 'Happy Paws' })}
        getStatusBadge={noopBadge}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: 'Happy Paws' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the pet link is clicked', () => {
    const onClose = vi.fn();
    render(
      <DetailsTab
        conversation={buildConversation({ petId: 'pet-9' })}
        getStatusBadge={noopBadge}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: 'pet-9' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the rescue name as plain text when rescueId is missing', () => {
    render(
      <DetailsTab
        conversation={buildConversation({ rescueName: 'Orphan Rescue' })}
        getStatusBadge={noopBadge}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole('link', { name: 'Orphan Rescue' })).not.toBeInTheDocument();
    expect(screen.getByText('Orphan Rescue')).toBeInTheDocument();
  });
});
