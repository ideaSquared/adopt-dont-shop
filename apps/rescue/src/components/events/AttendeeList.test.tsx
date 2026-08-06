import { describe, it, expect, vi } from 'vitest';

import { renderWithProviders, screen, fireEvent } from '../../test-utils';
import AttendeeList from './AttendeeList';
import type { EventAttendee } from '../../types/events';

const buildAttendee = (overrides: Partial<EventAttendee> = {}): EventAttendee => ({
  userId: 'u-1',
  name: 'Ada Lovelace',
  email: 'ada@example.org',
  registeredAt: '2026-01-15T10:00:00Z',
  checkedIn: false,
  ...overrides,
});

describe('AttendeeList', () => {
  it('renders a row per attendee with name and email', () => {
    renderWithProviders(
      <AttendeeList
        attendees={[
          buildAttendee(),
          buildAttendee({ userId: 'u-2', name: 'Grace Hopper', email: 'grace@example.org' }),
        ]}
      />
    );

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('grace@example.org')).toBeInTheDocument();
  });

  it('shows the shared empty message when there are no attendees', () => {
    renderWithProviders(<AttendeeList attendees={[]} />);

    expect(screen.getByText('No attendees registered yet.')).toBeInTheDocument();
  });

  it('fires onCheckIn for an attendee who has not checked in', () => {
    const onCheckIn = vi.fn();
    renderWithProviders(<AttendeeList attendees={[buildAttendee()]} onCheckIn={onCheckIn} />);

    fireEvent.click(screen.getByRole('button', { name: 'Check In' }));

    expect(onCheckIn).toHaveBeenCalledWith('u-1');
  });

  it('shows a checked-in indicator instead of a button once checked in', () => {
    const onCheckIn = vi.fn();
    renderWithProviders(
      <AttendeeList
        attendees={[buildAttendee({ checkedIn: true, checkedInAt: '2026-01-16T09:30:00Z' })]}
        onCheckIn={onCheckIn}
      />
    );

    expect(screen.queryByRole('button', { name: 'Check In' })).toBeNull();
  });

  it('omits the action column when no onCheckIn handler is provided', () => {
    renderWithProviders(<AttendeeList attendees={[buildAttendee()]} />);

    expect(screen.queryByRole('button', { name: 'Check In' })).toBeNull();
  });
});
