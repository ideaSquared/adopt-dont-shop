import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { toast } from '@adopt-dont-shop/lib.components';
import { render, screen } from '@/test-utils/render';
import { CheckYourEmailPage } from './CheckYourEmailPage';

const resendVerificationEmailMock = vi.fn();

vi.mock('@/services', () => ({
  authService: {
    resendVerificationEmail: () => resendVerificationEmailMock(),
  },
}));

describe('CheckYourEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tells the user a verification link has been sent', () => {
    render(<CheckYourEmailPage />);

    expect(screen.getByRole('heading', { name: 'Check Your Email' })).toBeInTheDocument();
    expect(screen.getByText(/sent a verification link/i)).toBeInTheDocument();
  });

  it('confirms with a toast when the verification email is resent', async () => {
    resendVerificationEmailMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CheckYourEmailPage />);
    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Verification email sent! Please check your inbox.'
      );
    });
  });

  it('shows the failure inline when the resend fails', async () => {
    resendVerificationEmailMock.mockRejectedValue(new Error('Too many requests'));
    const user = userEvent.setup();

    render(<CheckYourEmailPage />);
    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    expect(await screen.findByText('Too many requests')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
