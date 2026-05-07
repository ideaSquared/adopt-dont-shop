import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from '@/test-utils/render';
import { waitFor } from '@testing-library/react';
import { VerifyEmailPage } from './VerifyEmailPage';

const verifyEmailMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/services', () => ({
  authService: {
    verifyEmail: (token: string) => verifyEmailMock(token),
    resendVerificationEmail: vi.fn(),
  },
}));

let searchParamsValue = new URLSearchParams('?token=token-123');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [searchParamsValue, vi.fn()] as const,
  };
});

describe('VerifyEmailPage [ADS-375]', () => {
  beforeEach(() => {
    verifyEmailMock.mockReset();
    navigateMock.mockReset();
    searchParamsValue = new URLSearchParams('?token=token-123');
  });

  it('verifies the token exactly once even when the effect re-runs (StrictMode dev pass)', async () => {
    verifyEmailMock.mockResolvedValueOnce(undefined);

    const { unmount, rerender } = render(<VerifyEmailPage />);
    // Force the effect to run again — same render lifecycle, same token.
    rerender(<VerifyEmailPage />);

    await waitFor(() => {
      expect(verifyEmailMock).toHaveBeenCalledTimes(1);
    });
    expect(verifyEmailMock).toHaveBeenCalledWith('token-123');

    unmount();
  });

  it('does not navigate when the user unmounts during the 3-second redirect window', async () => {
    verifyEmailMock.mockResolvedValueOnce(undefined);

    const { unmount } = render(<VerifyEmailPage />);

    // Wait for the verifyEmail success path to schedule the timer.
    await waitFor(() => {
      expect(verifyEmailMock).toHaveBeenCalledTimes(1);
    });

    // The redirect timer is now scheduled. Switch to fake timers, unmount,
    // then advance — if cleanup ran, the timer is cleared and navigate is
    // never called.
    vi.useFakeTimers();
    unmount();
    vi.advanceTimersByTime(5000);
    vi.useRealTimers();

    expect(navigateMock).not.toHaveBeenCalled();
  });
});
