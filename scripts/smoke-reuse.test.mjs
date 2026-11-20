import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import {
  SERVICES,
  pushedDigestRef,
  promotionPlan,
  retagPairs,
  reuseDecision,
} from './smoke-reuse.mjs';

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
});

describe('promoting by digest', () => {
  const P = 'ghcr.io/x/ads';
  const tested = SERVICES.map(
    (svc, i) => `${P}/service-${svc}@sha256:${String(i).padStart(2, '0')}ab`
  );

  it('reads the digest docker push recorded for the candidate', () => {
    expect(
      pushedDigestRef(
        ['other/repo@sha256:99', `${P}/service-ops@sha256:12ab`],
        `${P}/service-ops:abc-candidate`
      )
    ).toBe(`${P}/service-ops@sha256:12ab`);
    expect(() => pushedDigestRef([], `${P}/service-ops:abc-candidate`)).toThrow();
  });

  it('promotes and signs exactly the tested digests, never a tag', () => {
    const plan = promotionPlan(tested, 'abc');
    expect(plan).toHaveLength(12);
    expect(plan[0]).toEqual({
      src: `${P}/service-gateway@sha256:00ab`,
      dst: `${P}/service-gateway:abc`,
      sign: `${P}/service-gateway@sha256:00ab`,
    });
  });

  it('refuses a plan that is missing a service or names one by tag', () => {
    expect(() => promotionPlan(tested.slice(1), 'abc')).toThrow(/gateway/);
    expect(() =>
      promotionPlan([`${P}/service-gateway:abc-candidate`, ...tested.slice(1)], 'abc')
    ).toThrow();
  });
});
