import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils/render';
import { ResetPasswordPage } from './ResetPasswordPage';

vi.mock('@/services', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

let searchParamsValue = new URLSearchParams('?token=token-123');
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [searchParamsValue, vi.fn()] as const,
  };
});

describe('ResetPasswordPage autocomplete attributes', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    searchParamsValue = new URLSearchParams('?token=token-123');
  });

  it('marks both password fields as new-password so managers prompt to save', () => {
    const { container } = render(<ResetPasswordPage />);

    const passwordInputs = container.querySelectorAll('input[type="password"]');

    expect(passwordInputs.length).toBe(2);
    passwordInputs.forEach(input => {
      expect(input).toHaveAttribute('autocomplete', 'new-password');
    });
  });
});

describe('ResetPasswordPage submit-gate before token validation [C2-3]', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('renders the submit button disabled when no token is in the URL', () => {
    searchParamsValue = new URLSearchParams('');

    render(<ResetPasswordPage />);

    const submit = screen.getByRole('button', { name: /reset password/i });
    expect(submit).toBeDisabled();
  });
});
