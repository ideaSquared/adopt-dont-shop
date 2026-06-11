// Local stand-in for vite/client's `ImportMeta.env`.
// This lib runs in Vite-hosted apps but doesn't itself depend on vite, so we
// declare the only fields we touch (`DEV`) instead of pulling in vite types.

interface ImportMetaEnv {
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
