import { describe, it, expect } from 'vitest';

import {
  parseOverrideKey,
  securityOverrides,
  lockfileConsumers,
  packumentsNeeded,
  judgeOverrides,
} from './check-stale-overrides.mjs';

// A pnpm-lock.yaml (v9) excerpt: one workspace importer and two third-party
// packages that depend on `ws`.
const LOCKFILE = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true

overrides:
  ws@<8.21.0: 8.21.0

importers:

  services/gateway:
    dependencies:
      ws:
        specifier: ^8.18.0
        version: 8.21.0
    devDependencies:
      '@types/ws':
        specifier: ^8.5.0
        version: 8.5.12

packages:

  ws@8.21.0:
    resolution: {integrity: sha512-x}
    peerDependencies:
      bufferutil: ^4.0.1

snapshots:

  engine.io@6.6.11:
    dependencies:
      '@types/ws': 8.5.12
      ws: 8.21.0
    transitivePeerDependencies:
      - bufferutil

  'socket.io-adapter@2.5.7(bufferutil@4.0.9)':
    dependencies:
      ws: 8.21.0(bufferutil@4.0.9)
    optionalDependencies:
      debug: 4.4.3

  ws@8.21.0: {}
`;

function packument(versions, latest, deps = {}) {
  return {
    'dist-tags': { latest },
    versions: Object.fromEntries(versions.map(v => [v, { dependencies: deps[v] ?? {} }])),
  };
}

const WS_VERSIONS = ['8.18.0', '8.20.1', '8.21.0', '8.22.0'];

function registry({ adapterWsRange }) {
  return new Map([
    ['ws', packument(WS_VERSIONS, '8.22.0')],
    ['engine.io', packument(['6.6.11'], '6.6.11', { '6.6.11': { ws: '~8.21.0' } })],
    [
      'socket.io-adapter',
      packument(['2.5.7'], '2.5.7', { '2.5.7': { ws: adapterWsRange, debug: '~4.4.1' } }),
    ],
  ]);
}

function judge(overrides, packuments, workspaceManifests = new Map()) {
  const entries = securityOverrides(overrides);
  return judgeOverrides(entries, lockfileConsumers(LOCKFILE), packuments, workspaceManifests);
}

describe('parseOverrideKey', () => {
  it('splits a scoped versioned key into name + range', () => {
    expect(parseOverrideKey('@fastify/static@<10.1.2')).toEqual({
      name: '@fastify/static',
      range: '<10.1.2',
      nested: false,
    });
  });

  it('does not mistake a >= version operator for a nested selector', () => {
    expect(parseOverrideKey('svgo@>=3.0.0 <3.3.4')).toMatchObject({ name: 'svgo', nested: false });
  });

  it('marks nested parent>child selectors', () => {
    expect(parseOverrideKey('react-zdog>react')).toMatchObject({
      name: 'react-zdog',
      nested: true,
    });
  });
});

describe('securityOverrides', () => {
  it('ignores dedup pins and nested peer shims', () => {
    const entries = securityOverrides({
      react: '19.2.7',
      '@types/react': '19.2.16',
      'eslint-plugin-react>eslint': '$eslint',
      'ws@<8.21.0': '8.21.0',
    });
    expect(entries.map(entry => entry.key)).toEqual(['ws@<8.21.0']);
  });
});

describe('lockfileConsumers', () => {
  it('reads workspace specifiers and third-party dependents, dropping peer suffixes', () => {
    const { importers, packages } = lockfileConsumers(LOCKFILE);

    expect(importers).toContainEqual({
      importer: 'services/gateway',
      name: 'ws',
      specifier: '^8.18.0',
    });
    expect(packages).toContainEqual({ parent: 'engine.io', parentVersion: '6.6.11', name: 'ws' });
    expect(packages).toContainEqual({
      parent: 'socket.io-adapter',
      parentVersion: '2.5.7',
      name: 'ws',
    });
    expect(packages).toContainEqual({
      parent: 'socket.io-adapter',
      parentVersion: '2.5.7',
      name: 'debug',
    });
  });

  it('ignores transitive peer lists', () => {
    const { packages } = lockfileConsumers(LOCKFILE);
    expect(packages.map(consumer => consumer.name)).not.toContain('- bufferutil');
  });
});

describe('packumentsNeeded', () => {
  it('fetches the overridden package and every package that depends on it', () => {
    const entries = securityOverrides({ 'ws@<8.21.0': '8.21.0' });
    expect(packumentsNeeded(entries, lockfileConsumers(LOCKFILE))).toEqual([
      'engine.io',
      'socket.io-adapter',
      'ws',
    ]);
  });
});

describe('judgeOverrides', () => {
  it('keeps an override while a consumer range would still resolve a vulnerable version', () => {
    const [result] = judge({ 'ws@<8.21.0': '8.21.0' }, registry({ adapterWsRange: '~8.20.0' }));

    expect(result.stale).toBe(false);
    expect(result.blockers).toEqual([
      { consumer: 'socket.io-adapter@2.5.7', range: '~8.20.0', resolves: '8.20.1' },
    ]);
  });

  it('flags an override as stale once every consumer resolves a patched version on its own', () => {
    const [result] = judge({ 'ws@<8.21.0': '8.21.0' }, registry({ adapterWsRange: '^8.17.1' }));

    expect(result.stale).toBe(true);
  });

  it('treats a bare key as a floor: anything outside its value is unsafe', () => {
    const [kept] = judge({ ws: '^8.22.0' }, registry({ adapterWsRange: '~8.21.0' }));
    const [stale] = judge({ ws: '^8.21.0' }, registry({ adapterWsRange: '~8.21.0' }));

    expect(kept.stale).toBe(false);
    expect(stale.stale).toBe(true);
  });

  it("judges a workspace package by its package.json range, not the lockfile's override-rewritten specifier", () => {
    // pnpm records the override's target as the importer specifier, so the
    // lockfile alone would hide that services/gateway still asks for ~8.20.0.
    const workspaceManifests = new Map([['services/gateway', { dependencies: { ws: '~8.20.0' } }]]);
    const [result] = judge(
      { 'ws@<8.21.0': '8.21.0' },
      registry({ adapterWsRange: '^8.17.1' }),
      workspaceManifests
    );

    expect(result.stale).toBe(false);
    expect(result.blockers).toEqual([
      { consumer: 'services/gateway', range: '~8.20.0', resolves: '8.20.1' },
    ]);
  });

  it('flags an override for a package nothing depends on any more', () => {
    const [result] = judge({ 'uuid@<11.1.1': '11.1.1' }, new Map());

    expect(result).toMatchObject({
      stale: true,
      reason: 'nothing in pnpm-lock.yaml depends on it',
    });
  });

  it('keeps an override when a consumer range cannot be evaluated', () => {
    const packuments = registry({ adapterWsRange: 'npm:ws-fork@^1.0.0' });
    const [result] = judge({ 'ws@<8.21.0': '8.21.0' }, packuments);

    expect(result.stale).toBe(false);
    expect(result.blockers).toContainEqual({
      consumer: 'socket.io-adapter@2.5.7',
      range: 'npm:ws-fork@^1.0.0',
      resolves: null,
    });
  });

  it('evaluates a consumer that declares the package through an alias of itself', () => {
    const packuments = registry({ adapterWsRange: 'npm:ws@~8.20.0' });
    const [result] = judge({ 'ws@<8.21.0': '8.21.0' }, packuments);

    expect(result.blockers).toEqual([
      { consumer: 'socket.io-adapter@2.5.7', range: 'npm:ws@~8.20.0', resolves: '8.20.1' },
    ]);
  });

  it('prefers dist-tags.latest when it satisfies the range, as pnpm does', () => {
    const packuments = registry({ adapterWsRange: '^8.0.0' });
    packuments.set('ws', packument([...WS_VERSIONS, '8.23.0-beta.1'], '8.20.1'));
    const [result] = judge({ 'ws@<8.21.0': '8.21.0' }, packuments);

    expect(result.blockers).toContainEqual({
      consumer: 'socket.io-adapter@2.5.7',
      range: '^8.0.0',
      resolves: '8.20.1',
    });
  });
});
