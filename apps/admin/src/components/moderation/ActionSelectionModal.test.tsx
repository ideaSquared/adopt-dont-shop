import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActionSelectionModal } from './ActionSelectionModal';

const DAY_MS = 24 * 60 * 60 * 1000;

const renderModal = (onSubmit = vi.fn()) => {
  render(<ActionSelectionModal isOpen onClose={vi.fn()} onSubmit={onSubmit} reportTitle='Spam' />);
  return onSubmit;
};

const chooseSuspension = () =>
  fireEvent.change(screen.getByLabelText(/action type/i), { target: { value: 'user_suspended' } });

const submitWithReason = () => {
  fireEvent.change(screen.getByLabelText(/reason \(visible to user\)/i), {
    target: { value: 'repeated spam' },
  });
  fireEvent.click(screen.getByRole('button', { name: /take action/i }));
};

describe('ActionSelectionModal suspension duration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers 1 day, 7 days, 30 days and indefinite', () => {
    renderModal();
    chooseSuspension();

    const options = Array.from(
      screen.getByLabelText(/suspension duration/i).querySelectorAll('option')
    ).map(option => option.textContent);
    expect(options).toEqual(['1 day', '7 days', '30 days', 'Indefinite']);
  });

  it('defaults to 7 days and submits the duration in days', () => {
    const onSubmit = renderModal();
    chooseSuspension();
    submitWithReason();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'user_suspended', duration: 7 })
    );
  });

  it('submits no duration for an indefinite suspension', () => {
    const onSubmit = renderModal();
    chooseSuspension();
    fireEvent.change(screen.getByLabelText(/suspension duration/i), { target: { value: '0' } });
    submitWithReason();

    expect(onSubmit.mock.calls[0][0].duration).toBeUndefined();
  });

  it('shows the recorded expiry date and says the account needs manual reactivation', () => {
    renderModal();
    chooseSuspension();
    fireEvent.change(screen.getByLabelText(/suspension duration/i), { target: { value: '30' } });

    const ends = new Date(Date.now() + 30 * DAY_MS).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const note = screen.getByText(new RegExp(`recorded expiry date is ${ends}`, 'i'));
    expect(note).toBeInTheDocument();
    expect(note.textContent).toMatch(/reactivate the account manually/i);
  });

  it('says there is no end date for an indefinite suspension', () => {
    renderModal();
    chooseSuspension();
    fireEvent.change(screen.getByLabelText(/suspension duration/i), { target: { value: '0' } });

    expect(screen.getByText(/no expiry date/i)).toBeInTheDocument();
  });
});
