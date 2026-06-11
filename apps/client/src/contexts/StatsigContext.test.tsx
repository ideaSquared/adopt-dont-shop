/**
 * Behaviour test for the client Statsig user-context shape.
 *
 * Adopters typically don't carry a `rescueId`, but the context must
 * still expose the field (as null) so future per-rescue gating rules
 * can bucket without a context migration.
 */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

const useClientAsyncInitMock = vi.fn();
const useAuthMock = vi.fn();
const hasAnalyticsConsentMock = vi.fn();
const subscribeToAnalyticsConsentMock = vi.fn();

vi.mock('@statsig/react-bindings', () => ({
  StatsigProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useClientAsyncInit: (...args: unknown[]) => useClientAsyncInitMock(...args),
}));

vi.mock('@statsig/session-replay', () => ({
  StatsigSessionReplayPlugin: vi.fn(),
}));

vi.mock('@statsig/web-analytics', () => ({
  StatsigAutoCapturePlugin: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@adopt-dont-shop/lib.observability', () => ({
  hasAnalyticsConsent: () => hasAnalyticsConsentMock(),
  subscribeToAnalyticsConsent: (...args: unknown[]) => subscribeToAnalyticsConsentMock(...args),
}));

import { StatsigWrapper } from './StatsigContext';

describe('StatsigWrapper (client)', () => {
  beforeEach(() => {
    useClientAsyncInitMock.mockReset();
    useClientAsyncInitMock.mockReturnValue({ client: { checkGate: () => false } });
    useAuthMock.mockReset();
    hasAnalyticsConsentMock.mockReset();
    hasAnalyticsConsentMock.mockReturnValue(false);
    subscribeToAnalyticsConsentMock.mockReset();
    subscribeToAnalyticsConsentMock.mockReturnValue(() => undefined);
  });

  it('exposes a rescueId key (undefined) for adopter users with no rescue association', () => {
    useAuthMock.mockReturnValue({
      user: { userId: 'u-1', userType: 'adopter' },
    });

    render(
      <StatsigWrapper>
        <div>child</div>
      </StatsigWrapper>
    );

    const [, statsigUser] = useClientAsyncInitMock.mock.calls[0];
    expect(statsigUser.custom.app).toBe('client');
    expect('rescueId' in statsigUser.custom).toBe(true);
    expect(statsigUser.custom.rescueId).toBeUndefined();
  });

  it('still includes rescueId when an unexpected rescueId is present', () => {
    useAuthMock.mockReturnValue({
      user: { userId: 'u-2', userType: 'adopter', rescueId: 'rescue-9' },
    });

    render(
      <StatsigWrapper>
        <div>child</div>
      </StatsigWrapper>
    );

    const [, statsigUser] = useClientAsyncInitMock.mock.calls[0];
    expect(statsigUser.custom.rescueId).toBe('rescue-9');
  });
});
