import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

const mockUseClientAsyncInit = vi.fn();
const mockProviderProps = vi.fn();

vi.mock('@statsig/react-bindings', () => ({
  StatsigProvider: (props: { children: ReactNode; loadingComponent: ReactNode }) => {
    mockProviderProps(props);
    return <>{props.children}</>;
  },
  useClientAsyncInit: (...args: unknown[]) => mockUseClientAsyncInit(...args),
}));

vi.mock('./StatsigWrapper.css', () => ({ loadingFallback: 'loadingFallback' }));

import { StatsigWrapper, type StatsigWrapperProps } from './StatsigWrapper';

describe('StatsigWrapper', () => {
  beforeEach(() => {
    mockUseClientAsyncInit.mockReturnValue({ client: { checkGate: () => false } });
  });

  it('renders its children', () => {
    render(
      <StatsigWrapper app="client" clientKey="client-key" user={null}>
        <div>child</div>
      </StatsigWrapper>
    );

    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('initialises Statsig with the supplied client key', () => {
    render(
      <StatsigWrapper app="client" clientKey="client-key" user={null}>
        <div />
      </StatsigWrapper>
    );

    expect(mockUseClientAsyncInit.mock.calls[0][0]).toBe('client-key');
  });

  it('buckets signed-out visitors as anonymous', () => {
    render(
      <StatsigWrapper app="client" clientKey="client-key" user={undefined}>
        <div />
      </StatsigWrapper>
    );

    const [, statsigUser] = mockUseClientAsyncInit.mock.calls[0];
    expect(statsigUser.userID).toBe('anonymous');
    expect(statsigUser.custom).toMatchObject({ app: 'client', isAuthenticated: false });
  });

  it('sends the opaque user id, app tag and user attributes, never the email', () => {
    render(
      <StatsigWrapper
        app="rescue"
        clientKey="client-key"
        user={{ userId: 'u-1', userType: 'rescue_staff', rescueId: 'r-9' }}
      >
        <div />
      </StatsigWrapper>
    );

    const [, statsigUser] = mockUseClientAsyncInit.mock.calls[0];
    expect(statsigUser).toEqual({
      userID: 'u-1',
      custom: {
        app: 'rescue',
        userType: 'rescue_staff',
        rescueId: 'r-9',
        isAuthenticated: true,
      },
    });
  });

  it('exposes a rescueId key (undefined) for users with no rescue', () => {
    render(
      <StatsigWrapper
        app="client"
        clientKey="client-key"
        user={{ userId: 'u-2', userType: 'adopter' }}
      >
        <div />
      </StatsigWrapper>
    );

    const [, statsigUser] = mockUseClientAsyncInit.mock.calls[0];
    expect('rescueId' in statsigUser.custom).toBe(true);
    expect(statsigUser.custom.rescueId).toBeUndefined();
  });

  it('merges extra custom fields over the defaults', () => {
    render(
      <StatsigWrapper
        app="admin"
        clientKey="client-key"
        user={{ userId: 'u-3', userType: 'moderator' }}
        extraCustom={{ role: 'moderator' }}
      >
        <div />
      </StatsigWrapper>
    );

    const [, statsigUser] = mockUseClientAsyncInit.mock.calls[0];
    expect(statsigUser.custom).toMatchObject({ app: 'admin', role: 'moderator' });
  });

  it('passes plugins through as Statsig options', () => {
    const plugins: NonNullable<StatsigWrapperProps['plugins']> = [
      { __plugin: 'auto-capture', bind: vi.fn() },
    ];

    render(
      <StatsigWrapper app="client" clientKey="client-key" user={null} plugins={plugins}>
        <div />
      </StatsigWrapper>
    );

    expect(mockUseClientAsyncInit.mock.calls[0][2]).toEqual({ plugins });
  });

  it('passes no options when there are no plugins', () => {
    render(
      <StatsigWrapper app="admin" clientKey="client-key" user={null}>
        <div />
      </StatsigWrapper>
    );

    expect(mockUseClientAsyncInit.mock.calls[0][2]).toBeUndefined();
  });

  it('falls back to an invalid key and logs when no client key is configured', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <StatsigWrapper app="admin" clientKey={undefined} user={null}>
        <div />
      </StatsigWrapper>
    );

    expect(mockUseClientAsyncInit.mock.calls[0][0]).toBe('client-invalid-key');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('VITE_STATSIG_CLIENT_KEY'));
  });

  it('shows the supplied loading label while Statsig initialises', () => {
    render(
      <StatsigWrapper
        app="client"
        clientKey="client-key"
        user={null}
        loadingLabel="Loading analytics..."
      >
        <div />
      </StatsigWrapper>
    );

    const { loadingComponent } = mockProviderProps.mock.calls[0][0];
    render(loadingComponent);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('defaults the loading label to Loading...', () => {
    render(
      <StatsigWrapper app="admin" clientKey="client-key" user={null}>
        <div />
      </StatsigWrapper>
    );

    const { loadingComponent } = mockProviderProps.mock.calls[0][0];
    render(loadingComponent);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
