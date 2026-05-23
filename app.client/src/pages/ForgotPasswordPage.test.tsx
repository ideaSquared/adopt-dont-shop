import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test-utils/render';
import { ForgotPasswordPage } from './ForgotPasswordPage';

const forgotPasswordMock = vi.fn();

vi.mock('@/services', () => ({
  authService: {
    forgotPassword: (email: string) => forgotPasswordMock(email),
  },
}));

describe('ForgotPasswordPage autocomplete attributes', () => {
  it('marks the email field as email so managers fill the saved address', () => {
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);

    expect(emailInput).toHaveAttribute('autocomplete', 'email');
  });
});

// C2-6: enumeration-proofing — every 4xx (including 429) must look
// identical to a 200 so an attacker can't time-correlate response
// flavour with "this email exists". Only genuine 5xx outages get a
// distinct error.
describe('ForgotPasswordPage enumeration-resistant response handling [C2-6]', () => {
  const submitForm = async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset instructions/i }));
  };

  const errorWithStatus = (status: number): Error & { response: { status: number } } => {
    const err = new Error('boom') as Error & { response: { status: number } };
    err.response = { status };
    return err;
  };

  beforeEach(() => {
    forgotPasswordMock.mockReset();
  });

  it.each([
    ['200 success', () => Promise.resolve()],
    ['400 bad request', () => Promise.reject(errorWithStatus(400))],
    ['404 not found', () => Promise.reject(errorWithStatus(404))],
    ['429 rate limited', () => Promise.reject(errorWithStatus(429))],
  ])('shows the generic success screen on %s', async (_label, factory) => {
    forgotPasswordMock.mockImplementationOnce(factory);

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /check your email/i })
      ).toBeInTheDocument();
    });
  });

  it('shows a generic try-again-later error on 5xx', async () => {
    forgotPasswordMock.mockRejectedValueOnce(errorWithStatus(500));

    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/server error\. please try again later/i)).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { level: 2, name: /check your email/i })
    ).not.toBeInTheDocument();
  });
});
