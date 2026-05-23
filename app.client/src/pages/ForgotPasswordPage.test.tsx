import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils/render';
import { ForgotPasswordPage } from './ForgotPasswordPage';

vi.mock('@/services', () => ({
  authService: {
    forgotPassword: vi.fn(),
  },
}));

describe('ForgotPasswordPage autocomplete attributes', () => {
  it('marks the email field as email so managers fill the saved address', () => {
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);

    expect(emailInput).toHaveAttribute('autocomplete', 'email');
  });
});
