import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findFocusedTests, findTestFiles, scanFocusedTests } from './check-no-test-only.mjs';

describe('findFocusedTests', () => {
  it('returns nothing for a clean test file', () => {
    const clean = [
      "describe('thing', () => {",
      "  it('does a thing', () => {",
      '    expect(true).toBe(true);',
      '  });',
      '});',
    ].join('\n');

    expect(findFocusedTests(clean)).toEqual([]);
  });

  it('flags describe.only', () => {
    expect(findFocusedTests("describe.only('x', () => {})")).toEqual([
      { line: 1, marker: 'describe.only' },
    ]);
  });

  it('flags it.only', () => {
    expect(findFocusedTests("it.only('x', () => {})")).toEqual([{ line: 1, marker: 'it.only' }]);
  });

  it('flags test.only', () => {
    expect(findFocusedTests("test.only('x', () => {})")).toEqual([
      { line: 1, marker: 'test.only' },
    ]);
  });

  it('flags a chained .only.each focus', () => {
    expect(findFocusedTests('it.only.each([1, 2])("case %s", () => {})')).toEqual([
      { line: 1, marker: 'it.only' },
    ]);
  });

  it('flags .only on any suite/test function (e.g. bench.only)', () => {
    expect(findFocusedTests("bench.only('x', () => {})")).toEqual([
      { line: 1, marker: 'bench.only' },
    ]);
  });

  it('flags the Jasmine-style fdescribe', () => {
    expect(findFocusedTests("fdescribe('x', () => {})")).toEqual([
      { line: 1, marker: 'fdescribe' },
    ]);
  });

  it('flags the Jasmine-style fit', () => {
    expect(findFocusedTests("fit('x', () => {})")).toEqual([{ line: 1, marker: 'fit' }]);
  });

  it('reports the correct line number for a focus buried in a file', () => {
    const src = [
      "describe('outer', () => {",
      "  it('a', () => {});",
      "  it.only('b', () => {});",
      '});',
    ].join('\n');

    expect(findFocusedTests(src)).toEqual([{ line: 3, marker: 'it.only' }]);
  });

  it('does not flag lookalikes such as readonly or onlyChild', () => {
    const src = [
      'const readonly = true;',
      'const el = node.onlyChild;',
      "const profit = fitness('gym');",
    ].join('\n');

    expect(findFocusedTests(src)).toEqual([]);
  });
});

describe('scanFocusedTests', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'check-no-test-only-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('passes when no test file contains a focused test', () => {
    writeFileSync(join(root, 'clean.test.ts'), "it('works', () => { expect(1).toBe(1); });\n");

    expect(scanFocusedTests(root)).toEqual([]);
  });

  it('flags a focused test with its file, line and marker', () => {
    writeFileSync(
      join(root, 'focused.test.ts'),
      ["it('a', () => {});", "it.only('b', () => {});"].join('\n') + '\n'
    );

    expect(scanFocusedTests(root)).toEqual([
      { file: 'focused.test.ts', line: 2, marker: 'it.only' },
    ]);
  });

  it('only scans test/spec files, ignoring production sources and .mjs helpers', () => {
    writeFileSync(join(root, 'helper.ts'), "export const only = () => it.only('x', () => {});\n");
    writeFileSync(join(root, 'script.test.mjs'), "it.only('x', () => {});\n");

    expect(scanFocusedTests(root)).toEqual([]);
  });

  it('skips node_modules when walking', () => {
    mkdirSync(join(root, 'node_modules', 'pkg'), { recursive: true });
    writeFileSync(join(root, 'node_modules', 'pkg', 'dep.test.ts'), "it.only('x', () => {});\n");

    expect(scanFocusedTests(root)).toEqual([]);
  });

  it('discovers test files nested under src/', () => {
    mkdirSync(join(root, 'src', 'grpc'), { recursive: true });
    writeFileSync(join(root, 'src', 'grpc', 'handlers.spec.tsx'), "fit('x', () => {});\n");

    expect(findTestFiles(root)).toEqual([join('src', 'grpc', 'handlers.spec.tsx')]);
  });
});
