import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils/render';

vi.mock('@adopt-dont-shop/lib.account', () => ({
  ConfirmEmailChange: ({ token, signInHref }: { token: string | null; signInHref: string }) => (
    <p>
      token={String(token)} signIn={signInHref}
    </p>
  ),
}));

let searchParamsValue = new URLSearchParams('?token=tok-123');
const setSearchParamsMock = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useSearchParams: () => [searchParamsValue, setSearchParamsMock] as const,
  };
});

import { ConfirmEmailChangePage } from './ConfirmEmailChangePage';

describe('ConfirmEmailChangePage', () => {
  beforeEach(() => {
    setSearchParamsMock.mockReset();
    searchParamsValue = new URLSearchParams('?token=tok-123');
  });

  it('hands the emailed token to the confirm screen, with sign-in on this app', () => {
    render(<ConfirmEmailChangePage />);

    expect(screen.getByText('token=tok-123 signIn=/login')).toBeInTheDocument();
  });

  it('removes the one-time token from the address bar (ADS-1012)', () => {
    render(<ConfirmEmailChangePage />);

    expect(setSearchParamsMock).toHaveBeenCalledWith(expect.any(URLSearchParams), {
      replace: true,
    });
    const [next] = setSearchParamsMock.mock.calls[0] as [URLSearchParams];
    expect(next.has('token')).toBe(false);
  });

  it('passes no token when the link had none', () => {
    searchParamsValue = new URLSearchParams('');
    render(<ConfirmEmailChangePage />);

    expect(screen.getByText('token=null signIn=/login')).toBeInTheDocument();
    expect(setSearchParamsMock).not.toHaveBeenCalled();
  });
});
