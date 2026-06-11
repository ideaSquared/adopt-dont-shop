/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  // ADS-406: Sentry DSN — when unset Sentry init is a no-op.
  readonly VITE_SENTRY_DSN?: string;
  // Optional release identifier surfaced to Sentry for sourcemap matching.
  readonly VITE_APP_RELEASE?: string;
  // ADS-493: Statsig client key.
  readonly VITE_STATSIG_CLIENT_KEY?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
