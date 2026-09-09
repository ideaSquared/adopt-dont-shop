import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeDistSize, findOverBudget } from './check-bundle-size.mjs';

describe('findOverBudget', () => {
  it('returns apps whose measured size exceeds their budget', () => {
    const sizes = { 'app.client': 100, 'app.admin': 300, 'app.rescue': 50 };
    const budgets = { 'app.client': 200, 'app.admin': 200, 'app.rescue': 200 };

    expect(findOverBudget(sizes, budgets)).toEqual([{ app: 'app.admin', size: 300, budget: 200 }]);
  });

  it('returns an empty array when every app is within budget', () => {
    const sizes = { 'app.client': 100 };
    const budgets = { 'app.client': 200 };

    expect(findOverBudget(sizes, budgets)).toEqual([]);
  });
});

describe('computeDistSize', () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bundle-size-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('sums .js and .css file sizes recursively, excluding .map files', () => {
    writeFileSync(join(dir, 'main.js'), 'a'.repeat(100));
    writeFileSync(join(dir, 'main.js.map'), 'b'.repeat(9_999));
    writeFileSync(join(dir, 'styles.css'), 'c'.repeat(50));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'assets', 'chunk.js'), 'd'.repeat(25));
    writeFileSync(join(dir, 'assets', 'image.png'), 'e'.repeat(1_000));

    expect(computeDistSize(dir)).toBe(100 + 50 + 25);
  });

  it('returns 0 for a directory that does not exist', () => {
    expect(computeDistSize(join(dir, 'does-not-exist'))).toBe(0);
  });
});
