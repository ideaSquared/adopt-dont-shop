/**
 * Behaviour tests for ApplicationTimeline module.
 *
 * Tests verify that rescue staff can view timeline events, toggle the
 * add-event form, and submit new events.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApplicationTimeline } from './ApplicationTimeline';
import { TimelineEventType } from '../../../types/applications';

vi.mock('../ApplicationReview.css', () => {
  const names = [
    'addEventForm',
    'addEventTitle',
    'button',
    'emptyTimeline',
    'formActions',
    'formGroup',
    'formLabel',
    'formRow',
    'formSelect',
    'formTextarea',
    'newStatusText',
    'notesText',
    'oldStatusText',
    'section',
    'sectionHeader',
    'sectionTitle',
    'statusChangeBlock',
    'timelineContainer',
    'timelineContent',
    'timelineData',
    'timelineDescription',
    'timelineHeader',
    'timelineIcon',
    'timelineItem',
    'timelineTimestamp',
    'timelineTitle',
    'timelineUser',
  ] as const;
  const out: Record<string, unknown> = {};
  for (const name of names) {
    const fn = (..._args: unknown[]) => name;
    out[name] = Object.assign(fn, { toString: () => name });
  }
  return out;
});

// formatStatusName converts snake_case to Title Case
vi.mock('../../../utils/statusUtils', () => ({
  formatStatusName: (s: string) => s,
}));

const sampleEvent = {
  id: 'evt-1',
  applicationId: 'app-1',
  event: 'note',
  description: 'Checked references',
  timestamp: new Date().toISOString(),
  userName: 'Staff Member',
};

const defaultProps = {
  timeline: [sampleEvent],
  timelineError: null,
  showAddEvent: false,
  setShowAddEvent: vi.fn(),
  newEventType: TimelineEventType.NOTE_ADDED,
  setNewEventType: vi.fn(),
  newEventDescription: '',
  setNewEventDescription: vi.fn(),
  isAddingEvent: false,
  onAddEvent: vi.fn(),
};

describe('ApplicationTimeline — display', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the empty state when there are no events', () => {
    render(<ApplicationTimeline {...defaultProps} timeline={[]} />);
    expect(screen.getByText(/no timeline events yet/i)).toBeInTheDocument();
  });

  it('renders a timeline event with description and user', () => {
    render(<ApplicationTimeline {...defaultProps} />);
    expect(screen.getByText('Checked references')).toBeInTheDocument();
    expect(screen.getByText(/Staff Member/)).toBeInTheDocument();
  });

  it('shows a timeline error when timelineError is set', () => {
    render(<ApplicationTimeline {...defaultProps} timeline={[]} timelineError="DB unreachable" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load timeline events/i);
  });
});

describe('ApplicationTimeline — add event form', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls setShowAddEvent when Add Event button is clicked', () => {
    const setShowAddEvent = vi.fn();
    render(<ApplicationTimeline {...defaultProps} setShowAddEvent={setShowAddEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    expect(setShowAddEvent).toHaveBeenCalledWith(true);
  });

  it('renders the add-event form when showAddEvent is true', () => {
    render(<ApplicationTimeline {...defaultProps} showAddEvent />);
    expect(screen.getByLabelText(/event type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('disables the submit button when description is empty', () => {
    render(<ApplicationTimeline {...defaultProps} showAddEvent newEventDescription="" />);
    const submitBtn = screen.getByRole('button', { name: /^add event$/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables the submit button when a description is provided', () => {
    render(<ApplicationTimeline {...defaultProps} showAddEvent newEventDescription="Some note" />);
    const submitBtn = screen.getByRole('button', { name: /^add event$/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onAddEvent when the submit button is clicked', () => {
    const onAddEvent = vi.fn();
    render(
      <ApplicationTimeline
        {...defaultProps}
        showAddEvent
        newEventDescription="Some note"
        onAddEvent={onAddEvent}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^add event$/i }));
    expect(onAddEvent).toHaveBeenCalled();
  });
});
