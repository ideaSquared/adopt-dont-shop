/**
 * ADS-491: file-type CVE GHSA-5v7r-6r5c-r473 fix.
 *
 * The vulnerable range is 13.0.0–21.3.0 (DoS via crafted ASF input). The
 * fixed line is file-type@22.x — but v22 is ESM-only, and service.backend
 * compiles with `module: CommonJS`. Static `import { ... } from 'file-type'`
 * gets down-compiled to `require('file-type')`, which fails at runtime on
 * an ESM-only module with `ERR_REQUIRE_ESM`.
 *
 * This wrapper bypasses TS's CJS down-compilation by routing the dynamic
 * import through `new Function('s','return import(s)')`, which TypeScript
 * cannot rewrite. The resolved module is cached so we only pay the
 * dynamic-import cost once per process.
 *
 * Tests should `vi.mock('../utils/file-type-wrapper', ...)` instead of
 * mocking 'file-type' directly — the dynamic import bypasses Vitest's
 * module registry, so mocking 'file-type' from the test file would have
 * no effect on this wrapper.
 */

// Routed through Function() so TypeScript leaves it as a real dynamic
// import at runtime (it would otherwise compile `import()` to a require()
// shim that can't load ESM-only packages). The Function() body contains
// no user-controlled input — it's a fixed `return import(specifier)`,
// where `specifier` is the only argument, supplied by trusted callers
// in this file. There's no eval-of-user-input path here.
// eslint-disable-next-line no-new-func -- ADS-491: only safe way to load ESM-only `file-type` from CJS-compiled service.backend
const dynamicImport = new Function('specifier', 'return import(specifier)') as <T = unknown>(
  specifier: string
) => Promise<T>;

export type FileTypeMatch = { mime: string; ext: string };
type FileTypeFromFileFn = (filePath: string) => Promise<FileTypeMatch | undefined>;

let cached: FileTypeFromFileFn | undefined;

/**
 * Magic-byte-based file type detection. Returns `undefined` when the file
 * has no recognisable signature (text-based formats, empty files, etc.).
 */
export const fileTypeFromFile: FileTypeFromFileFn = async filePath => {
  if (!cached) {
    const mod = await dynamicImport<{ fileTypeFromFile: FileTypeFromFileFn }>('file-type');
    cached = mod.fileTypeFromFile;
  }
  return cached(filePath);
};
