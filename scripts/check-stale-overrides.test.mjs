import { describe, it, expect } from 'vitest';

import {
  parseOverrideKey,
  classifyOverride,
  reportableOverrides,
} from './check-stale-overrides.mjs';

describe('parseOverrideKey', () => {
  it('splits an unscoped versioned key into name + range', () => {
    expect(parseOverrideKey('svgo@>=3.0.0 <3.3.4')).toEqual({
      name: 'svgo',
      range: '>=3.0.0 <3.3.4',
      nested: false,
    });
  });

  it('keeps the scope for a scoped versioned key', () => {
    expect(parseOverrideKey('@fastify/static@<10.1.2')).toEqual({
      name: '@fastify/static',
      range: '<10.1.2',
      nested: false,
    });
  });

  it('marks nested parent>child selectors', () => {
    expect(parseOverrideKey('react-zdog>react')).toEqual({
      name: 'react-zdog',
      range: null,
      nested: true,
    });
  });

  it('treats a bare package name as unversioned', () => {
    expect(parseOverrideKey('lodash')).toEqual({ name: 'lodash', range: null, nested: false });
  });
});

describe('classifyOverride', () => {
  it('flags a pin for review when latest is past the vulnerable range', () => {
    const result = classifyOverride({
      name: 'svgo',
      range: '>=3.0.0 <3.3.4',
      pinnedVersion: '3.3.4',
      latestVersion: '3.5.0',
    });
    expect(result.status).toBe('review');
  });

  it('keeps a pin when the latest release still sits inside the vulnerable range', () => {
    const result = classifyOverride({
      name: 'shell-quote',
      range: '<1.9.0',
      pinnedVersion: '1.9.0',
      latestVersion: '1.8.4',
    });
    expect(result.status).toBe('keep');
  });

  it('reports unknown when the latest version cannot be parsed', () => {
    const result = classifyOverride({
      name: 'lodash',
      range: null,
      pinnedVersion: '^4.18.1',
      latestVersion: null,
    });
    expect(result.status).toBe('unknown');
  });
});

describe('reportableOverrides', () => {
  it('excludes nested parent>child overrides', () => {
    const overrides = {
      'svgo@>=3.0.0 <3.3.4': '3.3.4',
      'react-zdog>react': '18.3.1',
    };
    const result = reportableOverrides(overrides);
    expect(result.map(r => r.name)).toEqual(['svgo']);
  });
});
