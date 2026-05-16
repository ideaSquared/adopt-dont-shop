import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/test-utils/render';
import { SubmissionSuccess } from './SubmissionSuccess';

const baseProps = {
  petName: 'Biscuit',
  rescueName: 'Happy Tails Rescue',
  email: 'adopter@example.com',
  applicationId: 'app-123',
  onViewApplication: vi.fn(),
  onViewAllApplications: vi.fn(),
};

describe('SubmissionSuccess – post-submit next steps [ADS-581]', () => {
  it('confirms the application has been sent to the named rescue', () => {
    render(<SubmissionSuccess {...baseProps} />);

    expect(screen.getByText(/application sent/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Happy Tails Rescue/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Biscuit/)).toBeInTheDocument();
  });

  it('tells the user a confirmation email has been sent to their address', () => {
    render(<SubmissionSuccess {...baseProps} />);

    // The user's email has to show in the success copy so they know where
    // the receipt is going to land.
    expect(screen.getByText(/adopter@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/confirmation/i)).toBeInTheDocument();
  });

  it('sets expectations for how long the rescue typically takes to respond', () => {
    render(<SubmissionSuccess {...baseProps} />);

    // The exact response time is not yet wired through, but the success
    // screen has to give the user a window so they are not left wondering.
    expect(screen.getByText(/responds/i)).toBeInTheDocument();
    expect(screen.getByText(/day/i)).toBeInTheDocument();
  });

  it('explains what happens if the rescue needs more information', () => {
    render(<SubmissionSuccess {...baseProps} />);

    // Adopters who submitted an application worry about silence — surface the
    // "we'll reach out if we need more info" path explicitly.
    expect(screen.getByText(/more information/i)).toBeInTheDocument();
  });

  it('exposes an explicit CTA that takes the user to this application', () => {
    const onViewApplication = vi.fn();

    render(<SubmissionSuccess {...baseProps} onViewApplication={onViewApplication} />);

    fireEvent.click(screen.getByRole('button', { name: /view (my )?application\b/i }));

    expect(onViewApplication).toHaveBeenCalledTimes(1);
  });

  it('exposes a secondary CTA to the applications dashboard', () => {
    const onViewAllApplications = vi.fn();

    render(<SubmissionSuccess {...baseProps} onViewAllApplications={onViewAllApplications} />);

    fireEvent.click(screen.getByRole('button', { name: /view all applications/i }));

    expect(onViewAllApplications).toHaveBeenCalledTimes(1);
  });
});
