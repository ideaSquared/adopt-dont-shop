import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { SERVICES, digestRef, retagPairs, reuseDecision } from './smoke-reuse.mjs';

const BEFORE = 'a'.repeat(40);
const passed = { check_runs: [{ status: 'completed', conclusion: 'success' }] };

const decide = (overrides = {}) =>
  reuseDecision({
    event: 'push',
    ref: 'refs/heads/main',
    imageChanged: 'false',
    deployChanged: 'false',
    before: BEFORE,
    checkRuns: passed,
    ...overrides,
  });

describe('reuseDecision', () => {
  it('reuses the previous commit when no image or smoke input changed and its smoke test passed', () => {
    expect(decide()).toMatchObject({ reuse: true });
  });

  it('runs the full test when an image input changed', () => {
    expect(decide({ imageChanged: 'true' })).toMatchObject({ reuse: false });
  });

  it('runs the full test when a file the smoke test boots with changed', () => {
    expect(decide({ deployChanged: 'true' })).toMatchObject({ reuse: false });
  });

  it('runs the full test when the previous smoke test did not pass, was cancelled or never ran', () => {
    expect(
      decide({ checkRuns: { check_runs: [{ status: 'completed', conclusion: 'failure' }] } })
    ).toMatchObject({ reuse: false });
    expect(
      decide({ checkRuns: { check_runs: [{ status: 'completed', conclusion: 'cancelled' }] } })
    ).toMatchObject({ reuse: false });
    expect(
      decide({ checkRuns: { check_runs: [{ status: 'in_progress', conclusion: null }] } })
    ).toMatchObject({ reuse: false });
    expect(decide({ checkRuns: { check_runs: [] } })).toMatchObject({ reuse: false });
    expect(decide({ checkRuns: undefined })).toMatchObject({ reuse: false });
  });

  it('only reuses on a push to main', () => {
    expect(decide({ event: 'pull_request' })).toMatchObject({ reuse: false });
    expect(decide({ event: 'workflow_dispatch' })).toMatchObject({ reuse: false });
    expect(decide({ ref: 'refs/heads/develop' })).toMatchObject({ reuse: false });
  });

  it('runs the full test when there is no previous commit to reuse', () => {
    expect(decide({ before: '0'.repeat(40) })).toMatchObject({ reuse: false });
    expect(decide({ before: '' })).toMatchObject({ reuse: false });
  });

  it('always says why', () => {
    expect(decide().reason).toContain(BEFORE.slice(0, 7));
    expect(decide({ imageChanged: 'true' }).reason).toMatch(/image/);
  });
});

describe('retagPairs', () => {
  it('copies each service image from the previous commit tag to this one', () => {
    const pairs = retagPairs({ prefix: 'ghcr.io/x/ads', from: 'old', to: 'new' });
    expect(pairs).toHaveLength(12);
    expect(pairs[0]).toEqual({
      src: 'ghcr.io/x/ads/service-gateway:old',
      dst: 'ghcr.io/x/ads/service-gateway:new',
    });
  });

  it('lists the same services docker-bake.hcl builds', () => {
    const bake = readFileSync(join(import.meta.dirname, '..', 'docker-bake.hcl'), 'utf8');
    const block = bake.match(/target "services"[\s\S]*?svc = \[([\s\S]*?)\]/)?.[1] ?? '';
    const listed = [...block.matchAll(/"([a-z-]+)"/g)].map(m => m[1]);
    expect(SERVICES).toEqual(listed);
  });
});

describe('build once', () => {
  it('names the smoke-tested images as candidates for this commit, then promotes them to its tag', () => {
    const candidates = retagPairs({ prefix: 'ghcr.io/x/ads', from: 'smoke', to: 'abc-candidate' });
    expect(candidates[0]).toEqual({
      src: 'ghcr.io/x/ads/service-gateway:smoke',
      dst: 'ghcr.io/x/ads/service-gateway:abc-candidate',
    });
    const promoted = retagPairs({ prefix: 'ghcr.io/x/ads', from: 'abc-candidate', to: 'abc' });
    expect(promoted[11]).toEqual({
      src: 'ghcr.io/x/ads/service-ops:abc-candidate',
      dst: 'ghcr.io/x/ads/service-ops:abc',
    });
  });

  it('signs by digest, never by tag', () => {
    expect(digestRef('ghcr.io/x/ads/service-ops:abc', 'sha256:123')).toBe(
      'ghcr.io/x/ads/service-ops@sha256:123'
    );
    expect(digestRef('localhost:5000/ads/service-ops:abc', 'sha256:9')).toBe(
      'localhost:5000/ads/service-ops@sha256:9'
    );
  });

  it('refuses something that is not a digest', () => {
    expect(() => digestRef('ghcr.io/x/ads/service-ops:abc', '')).toThrow();
    expect(() => digestRef('ghcr.io/x/ads/service-ops:abc', 'latest')).toThrow();
  });
});
