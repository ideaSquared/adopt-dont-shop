#!/usr/bin/env node
/**
 * Fails when a built app would call `require` in the browser.
 *
 * When rolldown cannot resolve a CommonJS `require` at build time, it emits a
 * runtime shim that throws `Calling require for "<module>" in an environment
 * that doesn't expose the require function`. lib.components once bundled
 * recharts' CommonJS deps with react external, so every app shipped that shim
 * and rendered a blank page, while the dev server, E2E and the image smoke
 * test (none of which load a production bundle in a browser) all passed.
 *
 * Usage: node scripts/check-runtime-require.mjs <dist-dir> [<dist-dir> ...]
 */
import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const SHIM_MARKER = 'Calling `require` for';

const listJsFiles = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listJsFiles(path);
    }
    return entry.name.endsWith('.js') ? [path] : [];
  });

/** Built JS files under `distDir` (relative paths) that contain the shim. */
export const findRuntimeRequireFiles = distDir =>
  listJsFiles(distDir)
    .filter(file => readFileSync(file, 'utf8').includes(SHIM_MARKER))
    .map(file => relative(distDir, file));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dirs = process.argv.slice(2);
  const offenders = dirs.flatMap(dir => findRuntimeRequireFiles(dir).map(f => join(dir, f)));
  if (offenders.length > 0) {
    console.error(
      `ERROR: these built files call require at runtime and will crash in the browser:\n${offenders
        .map(f => `  ${f}`)
        .join(
          '\n'
        )}\nA CommonJS dependency was bundled where its require() could not be resolved; ` +
        'mark it external in the library build that bundles it.'
    );
    process.exit(1);
  }
  console.log(`OK: no runtime require in ${dirs.join(', ')}`);
}
