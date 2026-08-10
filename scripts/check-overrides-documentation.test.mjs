import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { describe, it, expect } from 'vitest';

import {
  overrideBaseName,
  findUndocumentedOverrides,
  findOrphanedDocumentation,
} from './check-overrides-documentation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('overrideBaseName', () => {
  it('returns the bare name for an unscoped version selector', () => {
    expect(overrideBaseName('postcss@<=8.5.17')).toBe('postcss');
    expect(overrideBaseName('ws@>=8.0.0 <8.21.0')).toBe('ws');
  });

  it('keeps the scope for a scoped version selector', () => {
    expect(overrideBaseName('@fastify/static@<10.1.2')).toBe('@fastify/static');
    expect(overrideBaseName('@opentelemetry/propagator-jaeger@<2.9.0')).toBe(
      '@opentelemetry/propagator-jaeger'
    );
  });

  it('reduces a nested selector to the parent package', () => {
    expect(overrideBaseName('eslint-plugin-react>eslint')).toBe('eslint-plugin-react');
    expect(overrideBaseName('react-zdog>react')).toBe('react-zdog');
  });

  it('returns a plain package name unchanged', () => {
    expect(overrideBaseName('lodash')).toBe('lodash');
    expect(overrideBaseName('@types/react')).toBe('@types/react');
  });
});

describe('findUndocumentedOverrides', () => {
  it('flags a CVE override with no documentation entry', () => {
    const overrides = { 'ws@>=8.0.0 <8.21.0': '8.21.0', lodash: '^4.18.1' };
    const documentation = { lodash: 'note' };
    expect(findUndocumentedOverrides(overrides, documentation)).toEqual(['ws']);
  });

  it('passes when every override base is documented', () => {
    const overrides = { 'postcss@<=8.5.17': '8.5.23', lodash: '^4.18.1' };
    const documentation = { postcss: 'note', lodash: 'note' };
    expect(findUndocumentedOverrides(overrides, documentation)).toEqual([]);
  });

  it('exempts structural/dedup overrides even when undocumented', () => {
    const overrides = { 'react-zdog>react': '18.3.1', 'react-dom': '19.2.7' };
    expect(findUndocumentedOverrides(overrides, {})).toEqual([]);
  });

  it('collapses multiple version-range pins of one package to a single base', () => {
    const overrides = {
      'brace-expansion@<1.1.18': '1.1.18',
      'brace-expansion@>=2.0.0 <2.1.4': '2.1.4',
    };
    expect(findUndocumentedOverrides(overrides, {})).toEqual(['brace-expansion']);
  });
});

describe('findOrphanedDocumentation', () => {
  it('flags a documentation note with no matching override', () => {
    const overrides = { lodash: '^4.18.1' };
    const documentation = { lodash: 'note', 'left-pad': 'stale note' };
    expect(findOrphanedDocumentation(overrides, documentation)).toEqual(['left-pad']);
  });

  it('returns nothing when documentation and overrides agree', () => {
    const overrides = { lodash: '^4.18.1', 'postcss@<=8.5.17': '8.5.23' };
    const documentation = { lodash: 'note', postcss: 'note' };
    expect(findOrphanedDocumentation(overrides, documentation)).toEqual([]);
  });
});

// Live parity against the real root package.json — this is what makes CI
// (test:scripts) fail if a new CVE override merges without a documentation
// note, without depending on ci.yml wiring.
describe('root package.json parity (ADS-1113)', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

  it('documents every CVE-style pnpm.overrides entry', () => {
    expect(
      findUndocumentedOverrides(pkg.pnpm?.overrides ?? {}, pkg.overridesDocumentation ?? {})
    ).toEqual([]);
  });
});
