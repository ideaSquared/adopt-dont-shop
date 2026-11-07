import { describe, expect, it } from 'vitest';

import {
  assertSafeProject,
  findDevProjects,
  parseArgs,
  parseMemUsageMiB,
} from './e2e-isolated.mjs';

describe('assertSafeProject', () => {
  it('accepts the default and suffixed e2e project names', () => {
    expect(() => assertSafeProject('ads-e2e', { root: '/work/adopt-dont-shop' })).not.toThrow();
    expect(() => assertSafeProject('ads-e2e-2', { root: '/work/adopt-dont-shop' })).not.toThrow();
  });

  it.each(['adopt-dont-shop', 'Adopt-Dont-Shop', 'dev', 'ads-e2e/../x', ''])(
    'refuses %j so `down -v` can never reach the dev project',
    name => {
      expect(() => assertSafeProject(name, { root: '/work/adopt-dont-shop' })).toThrow(/Refusing/);
    }
  );

  it('refuses the checkout directory name and COMPOSE_PROJECT_NAME', () => {
    expect(() => assertSafeProject('ads-e2e-wt', { root: '/work/ads-e2e-wt' })).toThrow(/Refusing/);
    expect(() =>
      assertSafeProject('ads-e2e-mine', { root: '/work/x', composeProjectName: 'ads-e2e-mine' })
    ).toThrow(/Refusing/);
  });
});

describe('findDevProjects', () => {
  const ps = [
    'adopt-dont-shop|database',
    'adopt-dont-shop|service-gateway',
    'adopt-dont-shop|redis',
    'ads-e2e|service-gateway',
    '|',
  ].join('\n');

  it('reports other compose projects that run the heavy services', () => {
    expect(findDevProjects(ps, 'ads-e2e')).toEqual(['adopt-dont-shop']);
  });

  it('ignores the e2e project itself and unrelated containers', () => {
    expect(findDevProjects('ads-e2e|database\nother|nginx', 'ads-e2e')).toEqual([]);
  });
});

describe('parseArgs', () => {
  it('consumes its own flags and passes everything else to Playwright', () => {
    expect(
      parseArgs(['--full', '--keep', '--workers', '4', '--', 'tests/client/a.spec.ts', '--headed'])
    ).toEqual({
      flags: new Set(['--full', '--keep']),
      passthrough: ['tests/client/a.spec.ts', '--headed'],
      workers: '4',
    });
  });

  it('accepts --workers=n and leaves workers unset by default', () => {
    expect(parseArgs(['--workers=2']).workers).toBe('2');
    expect(parseArgs([]).workers).toBeUndefined();
  });
});

describe('parseMemUsageMiB', () => {
  it.each([
    ['585.7MiB', 585.7],
    ['1.5GiB', 1536],
    ['2048KiB', 2],
    ['garbage', 0],
  ])('reads %s', (text, expected) => {
    expect(parseMemUsageMiB(text)).toBeCloseTo(expected);
  });
});
