import { describe, expect, it, vi } from 'vitest';

import {
  assertSafeProject,
  findDevProjects,
  parseArgs,
  parseMemUsageMiB,
  planRestarts,
  RESTART_SETTLE_MS,
  superviseServices,
  UNHEALTHY_GRACE_MS,
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

// A service that dies or sticks unhealthy while the stack boots is restarted once,
// then reported. Under `tsx watch` a crashed app leaves its container "Up", so
// Compose's restart policy never fires and the boot would just stall.
const row = (service, State, Health = '') => ({ Service: service, State, Health });
const T0 = 1_000_000;
const fresh = () => ({ unhealthySince: {}, restartedAt: {} });

describe('planRestarts', () => {
  it('restarts an exited container straight away and says why', () => {
    const plan = planRestarts([row('service-applications', 'exited')], fresh(), T0);

    expect(plan.restart).toEqual([
      { service: 'service-applications', reason: expect.stringMatching(/exited/) },
    ]);
    expect(plan.giveUp).toEqual([]);
  });

  it('leaves a running, healthy container alone', () => {
    const plan = planRestarts(
      [row('database', 'running', 'healthy'), row('app-client', 'running')],
      fresh(),
      T0
    );

    expect(plan.restart).toEqual([]);
    expect(plan.giveUp).toEqual([]);
  });

  it('waits out the grace period for an unhealthy container, then restarts it', () => {
    const rows = [row('service-chat', 'running', 'unhealthy')];
    const first = planRestarts(rows, fresh(), T0);
    expect(first.restart).toEqual([]);

    const justBefore = planRestarts(rows, first.state, T0 + UNHEALTHY_GRACE_MS - 1);
    expect(justBefore.restart).toEqual([]);

    const after = planRestarts(rows, first.state, T0 + UNHEALTHY_GRACE_MS);
    expect(after.restart).toEqual([
      { service: 'service-chat', reason: expect.stringMatching(/unhealthy for \d+s/) },
    ]);
  });

  it('the unhealthy grace only counts continuous unhealthy time', () => {
    const unhealthy = [row('service-chat', 'running', 'unhealthy')];
    const healthy = [row('service-chat', 'running', 'healthy')];
    const a = planRestarts(unhealthy, fresh(), T0);
    const b = planRestarts(healthy, a.state, T0 + 60_000);
    const c = planRestarts(unhealthy, b.state, T0 + 61_000);
    const d = planRestarts(unhealthy, c.state, T0 + 61_000 + UNHEALTHY_GRACE_MS - 1);

    expect(d.restart).toEqual([]);
  });

  it('does not treat a starting container (no verdict yet) as unhealthy', () => {
    const plan = planRestarts([row('service-pets', 'running', 'starting')], fresh(), T0);
    expect(plan.restart).toEqual([]);
    expect(plan.state.unhealthySince).toEqual({});
  });

  it('restarts each service only once: a second exit after the settle time gives up', () => {
    const rows = [row('service-applications', 'exited')];
    const first = planRestarts(rows, fresh(), T0);
    expect(first.restart).toHaveLength(1);

    // Right after the restart, `compose ps` may still show the old state.
    const tooSoon = planRestarts(rows, first.state, T0 + RESTART_SETTLE_MS - 1);
    expect(tooSoon.restart).toEqual([]);
    expect(tooSoon.giveUp).toEqual([]);

    const later = planRestarts(rows, first.state, T0 + RESTART_SETTLE_MS);
    expect(later.restart).toEqual([]);
    expect(later.giveUp).toEqual([
      { service: 'service-applications', reason: expect.stringMatching(/exited/) },
    ]);
  });

  it('gives up on a restarted container that stays unhealthy for the grace period', () => {
    const unhealthy = [row('service-chat', 'running', 'unhealthy')];
    const a = planRestarts(unhealthy, fresh(), T0);
    const b = planRestarts(unhealthy, a.state, T0 + UNHEALTHY_GRACE_MS);
    expect(b.restart).toHaveLength(1);

    const c = planRestarts(unhealthy, b.state, T0 + UNHEALTHY_GRACE_MS + 1_000);
    const d = planRestarts(unhealthy, c.state, T0 + 2 * UNHEALTHY_GRACE_MS + 1_000);
    expect(c.giveUp).toEqual([]);
    expect(d.giveUp).toEqual([
      { service: 'service-chat', reason: expect.stringMatching(/unhealthy/) },
    ]);
  });

  it('does not mutate the state it is given', () => {
    const state = fresh();
    planRestarts([row('service-chat', 'running', 'unhealthy')], state, T0);
    planRestarts([row('service-pets', 'exited')], state, T0);
    expect(state).toEqual(fresh());
  });
});

describe('superviseServices', () => {
  const makeDeps = () => ({
    restartService: vi.fn(),
    tailLogs: vi.fn(() => 'line 39' + String.fromCharCode(10) + 'line 40'),
    log: vi.fn(),
  });

  it('restarts a dead service once, logs it, and keeps going', () => {
    const deps = makeDeps();
    const rows = [row('service-applications', 'exited')];

    const state = superviseServices(rows, fresh(), T0, deps);
    superviseServices(rows, state, T0 + 1_000, deps);

    expect(deps.restartService).toHaveBeenCalledTimes(1);
    expect(deps.restartService).toHaveBeenCalledWith('service-applications');
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining('service-applications'));
  });

  it('gives up after the second failure, naming the service and including its log tail', () => {
    const deps = makeDeps();
    const rows = [row('service-applications', 'exited')];
    const state = superviseServices(rows, fresh(), T0, deps);

    expect(() => superviseServices(rows, state, T0 + RESTART_SETTLE_MS, deps)).toThrow(
      /service-applications[\s\S]*line 40/
    );
    expect(deps.tailLogs).toHaveBeenCalledWith('service-applications', 40);
    expect(deps.restartService).toHaveBeenCalledTimes(1);
  });

  it('refuses a service name that is not a plain compose service name', () => {
    const deps = makeDeps();

    expect(() => superviseServices([row('x; rm -rf /', 'exited')], fresh(), T0, deps)).toThrow(
      /unexpected service name/
    );
    expect(deps.restartService).not.toHaveBeenCalled();
  });
});
