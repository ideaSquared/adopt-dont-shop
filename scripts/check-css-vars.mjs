#!/usr/bin/env node
/**
 * Fails when a built app's CSS reads theme variables that nothing defines.
 *
 * vanilla-extract compiles the theme to classes that define hashed custom
 * properties (`--_1uyoboz2t`) and every component style reads them through
 * var(). Apps once built against lib.components' prebuilt dist, whose CSS no
 * bundle imported, so staging shipped component styles that read 270 theme
 * variables with none defined and rendered unstyled, while the dev server (which
 * compiles lib.components from source) looked fine.
 *
 * Only vanilla-extract's hashed names (`--_<hash>`) are checked: third-party
 * variables such as `--radix-*` are set at runtime from JS. It also fails when
 * no stylesheet styles `body`, which is how the global reset goes missing.
 *
 * Usage: node scripts/check-css-vars.mjs <dist-dir> [<dist-dir> ...]
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const DEFINITION = /(--_[a-z0-9]+)\s*:/g;
const USE = /var\(\s*(--_[a-z0-9]+)/g;

const listCssFiles = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listCssFiles(path);
    }
    return entry.name.endsWith('.css') ? [path] : [];
  });

// A `body` rule as minified CSS emits it: at the start, or after `}`, `,` or `;`.
const BODY_RULE = /(^|[},;])\s*body\s*[{,]/m;

const namesMatching = (css, pattern) => [...css.matchAll(pattern)].map(match => match[1]);

const readCss = distDir =>
  listCssFiles(distDir)
    .map(file => readFileSync(file, 'utf8'))
    .join('\n');

/** Theme variables read by the CSS under `distDir` that no CSS file defines, sorted. */
export const findUndefinedCssVars = distDir => {
  const css = readCss(distDir);
  const defined = new Set(namesMatching(css, DEFINITION));
  return [...new Set(namesMatching(css, USE))].filter(name => !defined.has(name)).sort();
};

/**
 * Whether the build ships lib.components' global styles (GlobalStyles.css.ts,
 * imported by ThemeProvider only for its side effect). A production build
 * tree-shakes that import away when package.json `sideEffects` omits .css.ts.
 */
export const hasGlobalBodyStyles = distDir => BODY_RULE.test(readCss(distDir));

const describeFailures = dir => {
  const missing = findUndefinedCssVars(dir);
  return [
    ...(missing.length > 0 ? [`${dir}: ${missing.length} undefined, e.g. ${missing[0]}`] : []),
    ...(hasGlobalBodyStyles(dir) ? [] : [`${dir}: no global body styles`]),
  ];
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dirs = process.argv.slice(2);
  const failures = dirs.flatMap(describeFailures);
  if (failures.length > 0) {
    console.error(
      `ERROR: built CSS is missing lib.components' theme or global styles, so the app renders unstyled:\n${failures
        .map(f => `  ${f}`)
        .join('\n')}\nCheck that the app compiles lib.components from source ` +
        "(vite.shared.config.ts getLibraryAliases) and that its package.json 'sideEffects' keeps .css.ts files."
    );
    process.exit(1);
  }
  console.log(`OK: theme variables and global styles present in ${dirs.join(', ')}`);
}
