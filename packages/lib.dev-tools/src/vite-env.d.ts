// ADS-1231: minimal ImportMeta augmentation so this library can reference
// `import.meta.env?.DEV` under its tsc-only type-check. Unlike the app-facing
// libs, lib.dev-tools has no direct `vite` dependency, so `vite/client` types
// are not resolvable here — hence the hand-written shim rather than a
// `/// <reference types="vite/client" />`. The `?` keeps every property
// optional so the guard also compiles in a plain-tsc (non-Vite) context.
interface ImportMetaEnv {
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
