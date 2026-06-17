import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import type { Event } from '../../types/events';
import EventList from './EventList';

/**
 * Behaviour tests for the events list and the cards it renders. The list shows
 * a loading and empty state, and otherwise renders one selectable card per
 * event with its type, status and attendance summary.
 */
const event = (overrides: Partial<Event> = {}): Event => ({
  id: 'e1',
  rescueId: 'r1',
  name: 'Spring Adoption Day',
  description: 'Come meet our pets',
  type: 'adoption',
  startDate: '2024-06-01T10:00:00Z',
  endDate: '2024-06-01T16:00:00Z',
  location: { type: 'physical', address: '1 High St', city: 'Leeds', postcode: 'LS1' },
  capacity: 100,
  registrationRequired: true,
  status: 'published',
  assignedStaff: ['staff1', 'staff2'],
  isPublic: true,
  currentAttendance: 25,
  createdAt: '2024-05-01',
  updatedAt: '2024-05-01',
  ...overrides,
});

describe('EventList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a loading state', () => {
    render(<EventList events={[]} loading />);
    expect(screen.getByText('Loading events...')).toBeInTheDocument();
  });

  it('shows a default empty state', () => {
    render(<EventList events={[]} />);
    expect(screen.getByText('No Events Yet')).toBeInTheDocument();
    expect(
      screen.getByText('No events found. Create your first event to get started!')
    ).toBeInTheDocument();
  });

  it('shows a custom empty message', () => {
    render(<EventList events={[]} emptyMessage="Nothing scheduled" />);
    expect(screen.getByText('Nothing scheduled')).toBeInTheDocument();
  });

  it('renders an event card with name, type label and attendance', () => {
    render(<EventList events={[event()]} />);

    expect(screen.getByText('Spring Adoption Day')).toBeInTheDocument();
    expect(screen.getByText(/Adoption Event/)).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/100 registered/)).toBeInTheDocument();
    expect(screen.getByText('2 staff assigned')).toBeInTheDocument();
  });

  it('shows the virtual location label for virtual events', () => {
    render(
      <EventList events={[event({ location: { type: 'virtual', virtualLink: 'https://meet' } })]} />
    );
    expect(screen.getByText('Virtual Event')).toBeInTheDocument();
  });

  it('invokes the click handler when a card is activated', () => {
    const onEventClick = vi.fn();
    render(<EventList events={[event()]} onEventClick={onEventClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }));
  });

  it('activates a card via the Enter key', () => {
    const onEventClick = vi.fn();
    render(<EventList events={[event()]} onEventClick={onEventClick} />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }));
  });

  it('renders one card per event', () => {
    render(
      <EventList
        events={[event(), event({ id: 'e2', name: 'Fundraiser Gala', type: 'fundraising' })]}
      />
    );

    expect(screen.getByText('Spring Adoption Day')).toBeInTheDocument();
    expect(screen.getByText('Fundraiser Gala')).toBeInTheDocument();
    expect(screen.getByText(/Fundraising/)).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
