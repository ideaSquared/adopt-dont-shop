import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findRuntimeRequireFiles } from './check-runtime-require.mjs';

const SCRIPT = join(import.meta.dirname, 'check-runtime-require.mjs');

// What rolldown emits when a CommonJS `require` cannot be resolved at build
// time (the shim that blanked every app on staging).
const RUNTIME_REQUIRE_SHIM =
  'u=(e=>typeof require<`u`?require:e)(function(e){if(typeof require<`u`)return require.apply(this,arguments);throw Error(\'Calling `require` for "\'+e+"\\" in an environment that doesn\'t expose the `require` function.")});';

let dist;

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'runtime-require-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'assets', 'index-abc.js'), 'import{a}from"./react-vendor.js";a();');
});

afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

describe('check-runtime-require', () => {
  it('passes a build whose dependencies were all resolved at build time', () => {
    expect(findRuntimeRequireFiles(dist)).toEqual([]);
  });

  it('flags a built file that would call require in the browser', () => {
    writeFileSync(join(dist, 'assets', 'rolldown-runtime-xyz.js'), RUNTIME_REQUIRE_SHIM);

    expect(findRuntimeRequireFiles(dist)).toEqual([join('assets', 'rolldown-runtime-xyz.js')]);
  });

  it('ignores source maps, which may quote the shim without shipping it', () => {
    writeFileSync(join(dist, 'assets', 'index-abc.js.map'), RUNTIME_REQUIRE_SHIM);

    expect(findRuntimeRequireFiles(dist)).toEqual([]);
  });

  it('fails the CLI run, naming the file, when a build contains the shim', () => {
    writeFileSync(join(dist, 'assets', 'chat-lib-123.js'), RUNTIME_REQUIRE_SHIM);

    const result = spawnSync('node', [SCRIPT, dist], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(join('assets', 'chat-lib-123.js'));
  });

  it('exits cleanly for a clean build', () => {
    const result = spawnSync('node', [SCRIPT, dist], { encoding: 'utf8' });

    expect(result.status).toBe(0);
  });
});
