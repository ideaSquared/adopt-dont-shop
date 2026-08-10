import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectFilterPaths, isGlobPattern, missingLiteralPaths } from './check-workflow-paths.mjs';

describe('isGlobPattern', () => {
  it('treats entries with glob metacharacters as globs', () => {
    expect(isGlobPattern('tsconfig*.json')).toBe(true);
    expect(isGlobPattern('services/**')).toBe(true);
    expect(isGlobPattern('**/Dockerfile*')).toBe(true);
    expect(isGlobPattern('!vendor/**')).toBe(true);
  });

  it('treats exact paths as literals', () => {
    expect(isGlobPattern('package.json')).toBe(false);
    expect(isGlobPattern('.prettierrc')).toBe(false);
    expect(isGlobPattern('vite.shared.config.ts')).toBe(false);
  });
});

describe('collectFilterPaths', () => {
  it('collects items from a paths: block under an on.<trigger>', () => {
    const yaml = [
      'on:',
      '  push:',
      '    branches: [main]',
      '    paths:',
      "      - 'apps/**'",
      "      - 'package.json'",
      '  pull_request:',
      '    branches: [main]',
    ].join('\n');

    expect(collectFilterPaths(yaml)).toEqual(['apps/**', 'package.json']);
  });

  it('collects items across a dorny filters: block, ignoring the sub-keys', () => {
    const yaml = [
      '        with:',
      '          filters: |',
      '            backend:',
      "              - 'services/**'",
      "              - 'tsconfig.json'",
      '            libs:',
      "              - 'packages/**'",
    ].join('\n');

    // backend:/libs: are sub-keys, not list items — only the `- ` entries count.
    expect(collectFilterPaths(yaml)).toEqual(['services/**', 'tsconfig.json', 'packages/**']);
  });

  it('stops collecting when the block dedents', () => {
    const yaml = [
      '  push:',
      '    paths:',
      "      - 'apps/**'",
      '    branches:',
      '      - main',
    ].join('\n');

    // `main` sits under branches:, not paths: — it must not be collected.
    expect(collectFilterPaths(yaml)).toEqual(['apps/**']);
  });
});

describe('missingLiteralPaths', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'workflow-paths-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('flags a literal path that resolves to no file', () => {
    writeFileSync(join(root, 'package.json'), '{}');

    const missing = missingLiteralPaths(['package.json', 'tsconfig.json'], root);

    expect(missing).toEqual(['tsconfig.json']);
  });

  it('accepts a literal path that resolves to a directory', () => {
    mkdirSync(join(root, 'apps'));

    expect(missingLiteralPaths(['apps'], root)).toEqual([]);
  });

  it('never flags glob patterns, even when they match nothing on disk', () => {
    expect(missingLiteralPaths(['tsconfig*.json', 'services/**'], root)).toEqual([]);
  });
});
