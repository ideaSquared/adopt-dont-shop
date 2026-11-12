import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findUndefinedCssVars, hasGlobalBodyStyles } from './check-css-vars.mjs';

const SCRIPT = join(import.meta.dirname, 'check-css-vars.mjs');

// A vanilla-extract theme class defines the hashed custom properties that
// every component class reads through var().
const THEME_CSS = '._1uyoboz0{--_1uyoboz2t:1rem;--_1uyoboz4:#2563eb}';
// lib.components' GlobalStyles.css.ts: the reset and base typography.
const GLOBAL_CSS = 'body{color:var(--_1uyoboz4);font-family:Inter}';
const COMPONENT_CSS = '._1tzvktz2{padding:var(--_1uyoboz2t);color:var(--_1uyoboz4)}';

let dist;

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'css-vars-'));
  mkdirSync(join(dist, 'assets'));
});

afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

describe('check-css-vars', () => {
  it('passes a build whose theme defines every variable its styles read', () => {
    writeFileSync(join(dist, 'assets', 'index-abc.css'), THEME_CSS);
    writeFileSync(join(dist, 'assets', 'HomePage-def.css'), COMPONENT_CSS);

    expect(findUndefinedCssVars(dist)).toEqual([]);
  });

  it('flags theme variables that no stylesheet in the build defines', () => {
    writeFileSync(join(dist, 'assets', 'HomePage-def.css'), COMPONENT_CSS);

    expect(findUndefinedCssVars(dist)).toEqual(['--_1uyoboz2t', '--_1uyoboz4']);
  });

  it('ignores variables set at runtime by third-party libraries', () => {
    writeFileSync(
      join(dist, 'assets', 'select-abc.css'),
      '._x1{width:var(--radix-select-trigger-width)}'
    );

    expect(findUndefinedCssVars(dist)).toEqual([]);
  });

  it('recognises a build that ships the global body styles', () => {
    writeFileSync(join(dist, 'assets', 'index-abc.css'), `${THEME_CSS}${GLOBAL_CSS}`);

    expect(hasGlobalBodyStyles(dist)).toBe(true);
  });

  it('flags a build whose global body styles were tree-shaken away', () => {
    writeFileSync(join(dist, 'assets', 'index-abc.css'), `${THEME_CSS}${COMPONENT_CSS}`);

    expect(hasGlobalBodyStyles(dist)).toBe(false);
  });

  it('fails the CLI run when the global body styles are missing', () => {
    writeFileSync(join(dist, 'assets', 'index-abc.css'), `${THEME_CSS}${COMPONENT_CSS}`);

    const result = spawnSync('node', [SCRIPT, dist], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no global body styles');
  });

  it('fails the CLI run, naming the build and a missing variable', () => {
    writeFileSync(join(dist, 'assets', 'HomePage-def.css'), COMPONENT_CSS);

    const result = spawnSync('node', [SCRIPT, dist], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(dist);
    expect(result.stderr).toContain('--_1uyoboz2t');
  });

  it('exits cleanly for a fully styled build', () => {
    writeFileSync(
      join(dist, 'assets', 'index-abc.css'),
      `${THEME_CSS}${GLOBAL_CSS}${COMPONENT_CSS}`
    );

    const result = spawnSync('node', [SCRIPT, dist], { encoding: 'utf8' });

    expect(result.status).toBe(0);
  });
});
