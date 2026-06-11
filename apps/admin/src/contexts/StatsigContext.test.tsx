/**
 * Behaviour test for the admin Statsig user-context shape.
 *
 * Locks in the defensive `rescueId` field so future per-rescue gating
 * rules can bucket admins (who typically have no rescueId — they're
 * staff/moderators) without a context migration. The mocks below let us
 * intercept the user object passed to `useClientAsyncInit` without
 * actually booting the Statsig client.
 */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

const useClientAsyncInitMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@statsig/react-bindings', () => ({
  StatsigProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useClientAsyncInit: (...args: unknown[]) => useClientAsyncInitMock(...args),
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => useAuthMock(),
}));

import { StatsigWrapper } from './StatsigContext';

describe('StatsigWrapper (admin)', () => {
  beforeEach(() => {
    useClientAsyncInitMock.mockReset();
    useClientAsyncInitMock.mockReturnValue({ client: { checkGate: () => false } });
    useAuthMock.mockReset();
  });

  it('includes rescueId in the Statsig user custom dims', () => {
    useAuthMock.mockReturnValue({
      user: {
        userId: 'u-1',
        userType: 'admin',
        rescueId: 'rescue-42',
      },
    });

    render(
      <StatsigWrapper>
        <div>child</div>
      </StatsigWrapper>
    );

    const [, statsigUser] = useClientAsyncInitMock.mock.calls[0];
    expect(statsigUser.custom).toMatchObject({
      app: 'admin',
      rescueId: 'rescue-42',
    });
  });

  it('exposes a rescueId key (undefined) when the user has no rescue association', () => {
    useAuthMock.mockReturnValue({
      user: { userId: 'u-2', userType: 'admin' },
    });

    render(
      <StatsigWrapper>
        <div>child</div>
      </StatsigWrapper>
    );

    const [, statsigUser] = useClientAsyncInitMock.mock.calls[0];
    expect('rescueId' in statsigUser.custom).toBe(true);
    expect(statsigUser.custom.rescueId).toBeUndefined();
  });
});
