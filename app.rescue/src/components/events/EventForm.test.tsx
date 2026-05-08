import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the css module so vanilla-extract style imports don't blow up.
vi.mock('./EventForm.css', () => ({
  formContainer: 'form-container',
  formTitle: 'form-title',
  formGrid: 'form-grid',
  formGroup: 'form-group',
  formRow: 'form-row',
  formActions: 'form-actions',
  label: 'label',
  input: 'input',
  textArea: 'text-area',
  select: 'select',
  helperText: 'helper-text',
  checkboxGroup: 'checkbox-group',
  checkbox: 'checkbox',
  button: ({ variant }: { variant: string }) => `button-${variant}`,
}));

import EventForm from './EventForm';

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/Event Name/i), {
    target: { name: 'name', value: 'Spring Adoption' },
  });
  fireEvent.change(screen.getByLabelText(/Description/i), {
    target: { name: 'description', value: 'Annual spring adoption fair' },
  });
  fireEvent.change(screen.getByLabelText(/Start Date & Time/i), {
    target: { name: 'startDate', value: '2026-06-01T10:00' },
  });
  fireEvent.change(screen.getByLabelText(/End Date & Time/i), {
    target: { name: 'endDate', value: '2026-06-01T16:00' },
  });
};

describe('EventForm double-submit protection', () => {
  it('only fires onSubmit once when the user clicks submit twice in quick succession', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    // The parent owns the in-flight flag and flips `submitting` on first submit.
    const { rerender } = render(
      <EventForm onSubmit={onSubmit} onCancel={onCancel} submitting={false} />
    );

    fillRequiredFields();

    const submit = screen.getByRole('button', { name: /Create Event/i });

    // First click — parent will set submitting=true after this fires.
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    // Re-render with submitting=true (mimics the parent's state update).
    rerender(<EventForm onSubmit={onSubmit} onCancel={onCancel} submitting={true} />);

    const submitWhileBusy = screen.getByRole('button', { name: /Saving/i });
    expect(submitWhileBusy).toBeDisabled();

    fireEvent.click(submitWhileBusy);
    // Still only one call — second click was ignored.
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the cancel button while a submission is in flight', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<EventForm onSubmit={onSubmit} onCancel={onCancel} submitting={true} />);

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
  });

  it('shows a busy label on the submit button while submitting', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <EventForm onSubmit={onSubmit} onCancel={onCancel} submitting={true} isEditing={false} />
    );

    expect(screen.getByRole('button', { name: /Saving/i })).toHaveAttribute('aria-busy', 'true');
  });
});
