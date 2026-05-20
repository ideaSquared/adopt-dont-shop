import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { render, screen } from '@/test-utils/render';
import { ApplicationForm, type CategoryGroup } from './ApplicationForm';

const noopCategories: CategoryGroup[] = [
  {
    category: 'personal_information',
    title: 'About you',
    description: 'Tell us about yourself',
    questions: [],
  },
];

const baseProps = {
  categories: noopCategories,
  currentStep: 1,
  answers: {},
  pet: null,
  onStepComplete: vi.fn(),
  onStepBack: vi.fn(),
  onSubmit: vi.fn(),
  onSaveDraft: vi.fn(),
  onChange: vi.fn(),
  isSubmitting: false,
};

describe('ApplicationForm – Last saved indicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the last-saved timestamp persistently after a save, not just while status is "saved"', () => {
    const savedAt = new Date('2026-01-01T12:00:00Z');

    // Even when the auto-save hook has settled back to "idle", a previous save
    // should still be reflected in the UI so the user knows their work is safe.
    render(<ApplicationForm {...baseProps} saveStatus='idle' lastSaved={savedAt} />);

    expect(screen.getByText(/Draft saved/i)).toBeInTheDocument();
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it('ticks the "last saved" relative time as real time advances', () => {
    const savedAt = new Date('2026-01-01T12:00:00Z');

    render(<ApplicationForm {...baseProps} saveStatus='idle' lastSaved={savedAt} />);

    expect(screen.getByText(/just now/i)).toBeInTheDocument();

    // Advance time by ~2 minutes; the component's 30s tick should drive a
    // re-render that reflects the new relative timestamp.
    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(screen.getByText(/2 minutes ago/i)).toBeInTheDocument();
  });
});
