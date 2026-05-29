/// <reference types="vite/client" />

// Minimal ImportMeta augmentation for libraries that reference import.meta.env
// but are compiled without the full vite/client types (e.g. during tsc-only
// type-checks).  The `?` makes every property optional so code that guards
// with `import.meta.env?.DEV` compiles cleanly in both Vite and plain-tsc
// environments.
interface ImportMetaEnv {
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
