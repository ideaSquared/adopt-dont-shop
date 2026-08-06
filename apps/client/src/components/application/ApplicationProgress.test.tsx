import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import { ApplicationProgress } from './ApplicationProgress';

const steps = [
  { id: 1, title: 'About you', description: 'Tell us a bit about yourself' },
  { id: 2, title: 'Your home', description: 'Where the pet will live' },
  { id: 3, title: 'Review', description: 'Final check' },
];

describe('ApplicationProgress (shared Stepper adoption)', () => {
  it('renders every step title', () => {
    render(<ApplicationProgress steps={steps} currentStep={2} onStepClick={vi.fn()} />);

    expect(screen.getByText('About you')).toBeInTheDocument();
    expect(screen.getByText('Your home')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('marks the active step with aria-current="step"', () => {
    render(<ApplicationProgress steps={steps} currentStep={2} onStepClick={vi.fn()} />);

    const current = screen.getByText('Your home').closest('[aria-current="step"]');
    expect(current).not.toBeNull();
  });

  it('renders completed steps as interactive controls and upcoming steps as non-interactive', () => {
    render(<ApplicationProgress steps={steps} currentStep={2} onStepClick={vi.fn()} />);

    // Completed step is a real button…
    expect(screen.getByRole('button', { name: /about you/i })).toBeInTheDocument();
    // …the current and upcoming steps are not.
    expect(screen.queryByRole('button', { name: /your home/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /review/i })).toBeNull();
  });

  it('invokes onStepClick with the 1-based step number when a completed step is activated', async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();
    render(<ApplicationProgress steps={steps} currentStep={3} onStepClick={onStepClick} />);

    await user.click(screen.getByRole('button', { name: /about you/i }));
    expect(onStepClick).toHaveBeenCalledWith(1);
  });
});
