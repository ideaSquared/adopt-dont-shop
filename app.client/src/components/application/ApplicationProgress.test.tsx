import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@/test-utils/render';
import { ApplicationProgress } from './ApplicationProgress';

const steps = [
  { id: 1, title: 'About you', description: 'Tell us a bit about yourself' },
  { id: 2, title: 'Your home', description: 'Where the pet will live' },
  { id: 3, title: 'Review', description: 'Final check' },
];

describe('ApplicationProgress accessibility', () => {
  it('wraps the step list in a nav landmark labelled "Application steps"', () => {
    render(<ApplicationProgress steps={steps} currentStep={2} onStepClick={vi.fn()} />);

    const nav = screen.getByRole('navigation', { name: /application steps/i });
    expect(nav).toBeInTheDocument();
  });

  it('marks the active step with aria-current="step"', () => {
    render(<ApplicationProgress steps={steps} currentStep={2} onStepClick={vi.fn()} />);

    const active = screen.getByRole('button', { name: /2: your home/i });
    expect(active).toHaveAttribute('aria-current', 'step');
  });

  it('does not set aria-current on non-active steps', () => {
    render(<ApplicationProgress steps={steps} currentStep={2} onStepClick={vi.fn()} />);

    const completed = screen.getByRole('button', { name: /1: about you/i });
    expect(completed).not.toHaveAttribute('aria-current');
  });

  it('gives each step an aria-label of "{number}: {title}"', () => {
    render(<ApplicationProgress steps={steps} currentStep={1} onStepClick={vi.fn()} />);

    const nav = screen.getByRole('navigation', { name: /application steps/i });
    expect(within(nav).getByLabelText('1: About you')).toBeInTheDocument();
  });
});
