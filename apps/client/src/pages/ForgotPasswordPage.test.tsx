import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, NetworkError, TimeoutError, ValidationError } from '@adopt-dont-shop/lib.api';
import { render, screen, waitFor } from '@/test-utils/render';
import { ForgotPasswordPage } from './ForgotPasswordPage';

const forgotPasswordMock = vi.fn();

vi.mock('@/services', () => ({
  authService: {
    forgotPassword: (email: string) => forgotPasswordMock(email),
  },
}));

const rateLimited = (retryAfterSeconds?: number) =>
  new ApiError('Rate limit exceeded', 429, undefined, undefined, retryAfterSeconds);

const submitForm = async (user: ReturnType<typeof userEvent.setup>) => {
  render(<ForgotPasswordPage />);
  await user.type(screen.getByPlaceholderText(/enter your email/i), 'user@example.com');
  await user.click(screen.getByRole('button', { name: /send reset instructions/i }));
};

const successHeading = () => screen.queryByRole('heading', { level: 2, name: /check your email/i });

describe('ForgotPasswordPage autocomplete attributes', () => {
  it('marks the email field as email so managers fill the saved address', () => {
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);

    expect(emailInput).toHaveAttribute('autocomplete', 'email');
  });
});

// C2-6 (superseded): the old rule showed the success screen for every 4xx,
// including 429, to stop 429-vs-200 enumeration. The gateway limiters run
// before any account lookup and key only on request input, so a 429 is
// identical for known and unknown emails and is safe to surface.
describe('ForgotPasswordPage response handling', () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset();
  });

  it('shows the success screen on 200', async () => {
    forgotPasswordMock.mockResolvedValueOnce(undefined);

    await submitForm(userEvent.setup());

    await waitFor(() => expect(successHeading()).toBeInTheDocument());
  });

  it('keeps showing the success screen for a 400 validation response', async () => {
    forgotPasswordMock.mockRejectedValueOnce(new ValidationError('bad email'));

    await submitForm(userEvent.setup());

    await waitFor(() => expect(successHeading()).toBeInTheDocument());
  });

  it.each([
    ['500 ApiError', () => new ApiError('boom', 500)],
    ['503 ApiError', () => new ApiError('down', 503)],
    ['network error', () => new NetworkError('offline')],
    ['timeout', () => new TimeoutError(30000)],
    ['unknown error', () => new Error('weird')],
  ])('stays on the form with a generic error on %s', async (_label, makeError) => {
    forgotPasswordMock.mockRejectedValueOnce(makeError());

    await submitForm(userEvent.setup());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong on our side. Please try again shortly.');
    expect(successHeading()).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toHaveValue('user@example.com');
    expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeEnabled();
  });
});

describe('ForgotPasswordPage rate limiting', () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the Retry-After wait, disables submit with a countdown, then re-enables', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    forgotPasswordMock.mockRejectedValueOnce(rateLimited(30));

    await submitForm(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      "You've made too many reset requests. Please wait 30 seconds and try again."
    );
    expect(successHeading()).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toHaveValue('user@example.com');
    expect(screen.getByRole('button', { name: /try again in 30s/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByRole('button', { name: /try again in 20s/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent(/you can try again now/i);
  });

  it('falls back to a one minute wait when Retry-After is missing', async () => {
    forgotPasswordMock.mockRejectedValueOnce(rateLimited());

    await submitForm(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/please wait a minute and try again\./i);
    expect(screen.getByRole('button', { name: /try again in 60s/i })).toBeDisabled();
  });
});

describe('ForgotPasswordPage send again', () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('disables Send again for 60 seconds with a countdown, then resends', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    forgotPasswordMock.mockResolvedValue(undefined);

    await submitForm(user);

    await waitFor(() => expect(successHeading()).toBeInTheDocument());
    expect(screen.getByText(/spam/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send again in 60s/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent(/you can request another email now/i);
    await user.click(screen.getByRole('button', { name: /^send again$/i }));

    expect(forgotPasswordMock).toHaveBeenCalledTimes(2);
    expect(forgotPasswordMock).toHaveBeenLastCalledWith('user@example.com');
    expect(await screen.findByRole('button', { name: /send again in 60s/i })).toBeDisabled();
  });

  it('shows the rate-limit message if the resend is limited', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    forgotPasswordMock.mockResolvedValueOnce(undefined);
    forgotPasswordMock.mockRejectedValueOnce(rateLimited(45));

    await submitForm(user);
    await waitFor(() => expect(successHeading()).toBeInTheDocument());
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    await user.click(screen.getByRole('button', { name: /^send again$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/wait 45 seconds/i);
    expect(screen.getByRole('button', { name: /send again in 45s/i })).toBeDisabled();
  });
});

describe('ForgotPasswordPage async error announcement [C2-7]', () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset();
  });

  it('exposes the server error in a role="alert" live region', async () => {
    forgotPasswordMock.mockRejectedValueOnce(new ApiError('boom', 500));

    await submitForm(userEvent.setup());

    const alert = await waitFor(() => screen.getByRole('alert'));
    expect(alert).toHaveTextContent(/something went wrong/i);
  });
});
