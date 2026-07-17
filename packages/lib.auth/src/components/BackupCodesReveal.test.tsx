import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { BackupCodesReveal } from './BackupCodesReveal';

const codes = ['AAAA-1111', 'BBBB-2222', 'CCCC-3333'];

describe('BackupCodesReveal', () => {
  beforeEach(() => {
    // jsdom does not implement URL.createObjectURL / revokeObjectURL.
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValue('blob:mock-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  // @testing-library/user-event's setup() replaces navigator.clipboard with
  // its own stub, so the clipboard mock must be installed AFTER
  // userEvent.setup() runs (not in beforeEach) or it gets clobbered.
  const mockClipboard = (impl: ReturnType<typeof vi.fn>) => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: impl },
    });
  };

  it('displays every backup code and moves focus to the heading', () => {
    render(<BackupCodesReveal codes={codes} onDismiss={vi.fn()} />);

    codes.forEach((code) => {
      expect(screen.getByText(code)).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /save your backup codes/i })).toHaveFocus();
  });

  it('announces the reveal via the live region', () => {
    render(<BackupCodesReveal codes={codes} onDismiss={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '3 backup codes generated. Save them now — they will not be shown again.'
    );
  });

  it('keeps the Done button disabled until the user confirms they saved the codes', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<BackupCodesReveal codes={codes} onDismiss={onDismiss} />);

    const doneButton = screen.getByRole('button', { name: /done/i });
    expect(doneButton).toBeDisabled();

    await user.click(screen.getByLabelText(/i've saved these backup codes somewhere safe/i));
    expect(doneButton).toBeEnabled();

    await user.click(doneButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss when the Done button is clicked while still disabled', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<BackupCodesReveal codes={codes} onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: /done/i }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('copies every code to the clipboard, newline-separated', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<BackupCodesReveal codes={codes} onDismiss={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /copy codes/i }));

    expect(writeText).toHaveBeenCalledWith(codes.join('\n'));
    expect(await screen.findByRole('button', { name: /^copied$/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Backup codes copied to clipboard.');
  });

  it('announces a failure when the clipboard write is rejected', async () => {
    const user = userEvent.setup();
    mockClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    render(<BackupCodesReveal codes={codes} onDismiss={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /copy codes/i }));

    expect(
      await screen.findByText(/could not copy backup codes\. please copy them manually\./i)
    ).toBeInTheDocument();
  });

  it('downloads the codes as a text file', async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<BackupCodesReveal codes={codes} onDismiss={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /download as text/i }));

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(screen.getByRole('status')).toHaveTextContent('Backup codes downloaded as a text file.');

    clickSpy.mockRestore();
  });

  it('accepts a custom heading for the regenerate flow', () => {
    render(<BackupCodesReveal codes={codes} onDismiss={vi.fn()} heading="Your new backup codes" />);

    expect(screen.getByRole('heading', { name: /your new backup codes/i })).toBeInTheDocument();
  });
});
