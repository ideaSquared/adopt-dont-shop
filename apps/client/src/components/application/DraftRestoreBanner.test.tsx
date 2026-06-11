import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@/test-utils/render';
import { DraftRestoreBanner } from './DraftRestoreBanner';

describe('DraftRestoreBanner – explicit draft restore [ADS-581]', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:05:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the timestamp of the saved draft so the user knows what they are resuming', () => {
    const savedAt = new Date('2026-01-01T12:00:00Z');

    render(<DraftRestoreBanner savedAt={savedAt} onResume={vi.fn()} onStartOver={vi.fn()} />);

    // The banner has to identify the draft and let the user know it's old data
    // before they decide to keep it.
    expect(screen.getByText(/previous draft/i)).toBeInTheDocument();
    expect(screen.getByText(/saved 5 minutes ago/i)).toBeInTheDocument();
  });

  it('invokes onResume when the user confirms they want the saved draft', () => {
    const onResume = vi.fn();

    render(
      <DraftRestoreBanner
        savedAt={new Date('2026-01-01T12:00:00Z')}
        onResume={onResume}
        onStartOver={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('invokes onStartOver when the user discards the saved draft', () => {
    const onStartOver = vi.fn();

    render(
      <DraftRestoreBanner
        savedAt={new Date('2026-01-01T12:00:00Z')}
        onResume={vi.fn()}
        onStartOver={onStartOver}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /start over/i }));

    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});
