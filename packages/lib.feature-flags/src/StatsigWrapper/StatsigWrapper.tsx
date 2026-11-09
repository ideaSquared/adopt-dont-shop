import { StatsigProvider, useClientAsyncInit } from '@statsig/react-bindings';
import { useMemo, type ReactNode } from 'react';

import './StatsigWrapper.css';

type ClientAsyncInitOptions = NonNullable<Parameters<typeof useClientAsyncInit>[2]>;

/** The slice of the signed-in user Statsig needs; structurally satisfied by lib.auth's user. */
export type StatsigWrapperUser = {
  userId: string;
  userType?: string;
  rescueId?: string | null;
};

export type StatsigWrapperProps = {
  /** Which app is mounting the provider; sent as the `app` custom field. */
  app: string;
  /** The Statsig client key, usually `import.meta.env.VITE_STATSIG_CLIENT_KEY`. */
  clientKey: string | undefined;
  /** Signed-in user, or null/undefined for anonymous visitors. */
  user: StatsigWrapperUser | null | undefined;
  /** Extra custom fields merged over the defaults. Keep the reference stable (memoise it). */
  extraCustom?: Record<string, string | number | boolean | undefined>;
  /** Statsig plugins (e.g. consent-gated session replay). Keep the reference stable. */
  plugins?: ClientAsyncInitOptions['plugins'];
  /** Text shown while the Statsig client initialises. */
  loadingLabel?: string;
  children: ReactNode;
};

/**
 * Shared Statsig provider for the apps. The user is passed in so this library does not
 * depend on lib.auth. Email is intentionally never sent: Statsig is a third-party SaaS
 * and the opaque userID is enough for flag bucketing.
 */
export const StatsigWrapper = ({
  app,
  clientKey,
  user,
  extraCustom,
  plugins,
  loadingLabel = 'Loading...',
  children,
}: StatsigWrapperProps) => {
  if (!clientKey) {
    console.error(
      'VITE_STATSIG_CLIENT_KEY is not set. Feature flags will not work. Please add it to your .env file.'
    );
  }

  const statsigUser = useMemo(
    () => ({
      userID: user?.userId || 'anonymous',
      custom: {
        app,
        userType: user?.userType,
        // Defensive: include rescueId so future per-rescue gating rules can bucket
        // correctly. It is undefined for users with no rescue association.
        rescueId: user?.rescueId ?? undefined,
        isAuthenticated: !!user,
        ...extraCustom,
      },
    }),
    [app, user, extraCustom]
  );

  const { client } = useClientAsyncInit(
    clientKey || 'client-invalid-key',
    statsigUser,
    plugins ? { plugins } : undefined
  );

  return (
    <StatsigProvider
      client={client}
      loadingComponent={<div className="statsig-loading-fallback">{loadingLabel}</div>}
    >
      {children}
    </StatsigProvider>
  );
};
