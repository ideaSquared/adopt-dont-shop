import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  COMPOSE_FILE,
  findCadvisorUnsafeMounts,
  findMissingSecretsMasks,
  findUnsafeMainNginxConfig,
  findUnsafeSocketProxyConfig,
  findUnverifiedProxyConfigMounts,
  PROXY_CONF_FILE,
  PROXY_MAIN_CONF_FILE,
} from './check-observability-mounts.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('the real docker-compose.observability.yml (ADS-1376)', () => {
  it('finds no unsafe cAdvisor host-socket mount', () => {
    expect(findCadvisorUnsafeMounts(COMPOSE_FILE, REPO_ROOT)).toEqual([]);
  });

  it('masks /opt/ads in both node-exporter and cadvisor', () => {
    expect(findMissingSecretsMasks(COMPOSE_FILE, REPO_ROOT)).toEqual([]);
  });

  it('keeps the real docker-socket-proxy nginx config to an exact-path allow-list', () => {
    expect(findUnsafeSocketProxyConfig(PROXY_CONF_FILE, REPO_ROOT)).toEqual([]);
  });

  it('keeps the real main nginx.conf limited to `user root;` + the conf.d include', () => {
    expect(findUnsafeMainNginxConfig(PROXY_MAIN_CONF_FILE, REPO_ROOT)).toEqual([]);
  });

  it('mounts nginx.conf and server.conf at the exact paths the guard reads', () => {
    expect(findUnverifiedProxyConfigMounts(COMPOSE_FILE, REPO_ROOT)).toEqual([]);
  });
});

describe('findCadvisorUnsafeMounts', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'observability-mounts-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('flags a /var/run bind-mount on cadvisor', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
        '      - /var/run:/var/run:ro',
        '      - /sys:/sys:ro',
        '  node-exporter:',
        '    volumes:',
        '      - /:/host/root:ro',
      ].join('\n') + '\n'
    );

    const failures = findCadvisorUnsafeMounts('docker-compose.observability.yml', root);

    expect(failures).toEqual([
      { file: 'docker-compose.observability.yml', line: 5, mount: '/var/run' },
    ]);
  });

  it('flags a direct docker.sock bind-mount on cadvisor', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  cadvisor:',
        '    volumes:',
        '      - /var/run/docker.sock:/var/run/docker.sock:ro',
        '  node-exporter:',
        '    volumes:',
        '      - /:/host/root:ro',
      ].join('\n') + '\n'
    );

    expect(findCadvisorUnsafeMounts('docker-compose.observability.yml', root)).toHaveLength(1);
  });

  it('flags a /var/run mount with a trailing slash on the source', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      ['services:', '  cadvisor:', '    volumes:', '      - /var/run/:/var/run:ro'].join('\n') +
        '\n'
    );

    const failures = findCadvisorUnsafeMounts('docker-compose.observability.yml', root);

    expect(failures).toEqual([
      { file: 'docker-compose.observability.yml', line: 4, mount: '/var/run/' },
    ]);
  });

  it('flags a non-docker host socket nested under /var/run', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  cadvisor:',
        '    volumes:',
        '      - /var/run/podman/podman.sock:/run/podman.sock:ro',
      ].join('\n') + '\n'
    );

    const failures = findCadvisorUnsafeMounts('docker-compose.observability.yml', root);

    expect(failures).toEqual([
      {
        file: 'docker-compose.observability.yml',
        line: 4,
        mount: '/var/run/podman/podman.sock',
      },
    ]);
  });

  it('flags a /run bind-mount (the symlink target /var/run resolves to)', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      ['services:', '  cadvisor:', '    volumes:', '      - /run:/run:ro'].join('\n') + '\n'
    );

    const failures = findCadvisorUnsafeMounts('docker-compose.observability.yml', root);

    expect(failures).toEqual([
      { file: 'docker-compose.observability.yml', line: 4, mount: '/run' },
    ]);
  });

  it('flags a long-syntax /var/run bind-mount on cadvisor', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
        '      - type: bind',
        '        source: /var/run',
        '        target: /var/run',
        '        read_only: true',
        '  node-exporter:',
        '    volumes:',
        '      - /:/host/root:ro',
      ].join('\n') + '\n'
    );

    const failures = findCadvisorUnsafeMounts('docker-compose.observability.yml', root);

    expect(failures).toEqual([
      { file: 'docker-compose.observability.yml', line: 6, mount: '/var/run' },
    ]);
  });

  it('flags an inline-mapping-syntax /var/run bind-mount on cadvisor', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
        '      - { type: bind, source: /var/run, target: /var/run }',
      ].join('\n') + '\n'
    );

    const failures = findCadvisorUnsafeMounts('docker-compose.observability.yml', root);

    expect(failures).toEqual([
      { file: 'docker-compose.observability.yml', line: 5, mount: '/var/run' },
    ]);
  });

  it('flags a quoted short-syntax /var/run bind-mount on cadvisor', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      ['services:', '  cadvisor:', '    volumes:', '      - "/var/run:/var/run:ro"'].join('\n') +
        '\n'
    );

    const failures = findCadvisorUnsafeMounts('docker-compose.observability.yml', root);

    expect(failures).toEqual([
      { file: 'docker-compose.observability.yml', line: 4, mount: '/var/run' },
    ]);
  });

  it('flags a quoted long-syntax source on cadvisor', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  cadvisor:',
        '    volumes:',
        '      - type: bind',
        "        source: '/var/run'",
        '        target: /var/run',
      ].join('\n') + '\n'
    );

    const failures = findCadvisorUnsafeMounts('docker-compose.observability.yml', root);

    expect(failures).toEqual([
      { file: 'docker-compose.observability.yml', line: 5, mount: '/var/run' },
    ]);
  });

  it('accepts cadvisor mounts that omit /var/run and docker.sock', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
        '      - /sys:/sys:ro',
        '      - /var/lib/docker:/var/lib/docker:ro',
        '  node-exporter:',
        '    volumes:',
        '      - /:/host/root:ro',
        '      - /var/run:/var/run:ro',
      ].join('\n') + '\n'
    );

    expect(findCadvisorUnsafeMounts('docker-compose.observability.yml', root)).toEqual([]);
  });

  it('returns nothing when the file has no cadvisor service', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      ['services:', '  node-exporter:', '    volumes:', '      - /:/host/root:ro'].join('\n') + '\n'
    );

    expect(findCadvisorUnsafeMounts('docker-compose.observability.yml', root)).toEqual([]);
  });

  it('is not fooled by an earlier service nesting a same-named key (e.g. depends_on: cadvisor:)', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  grafana:',
        '    depends_on:',
        '      cadvisor:',
        '        condition: service_healthy',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
        '      - /var/run:/var/run:ro',
      ].join('\n') + '\n'
    );

    const failures = findCadvisorUnsafeMounts('docker-compose.observability.yml', root);

    expect(failures).toEqual([
      { file: 'docker-compose.observability.yml', line: 9, mount: '/var/run' },
    ]);
  });
});

describe('findMissingSecretsMasks', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'observability-mounts-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('flags node-exporter and cadvisor when neither masks /opt/ads', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  node-exporter:',
        '    volumes:',
        '      - /:/host/root:ro',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
      ].join('\n') + '\n'
    );

    expect(findMissingSecretsMasks('docker-compose.observability.yml', root)).toEqual([
      {
        file: 'docker-compose.observability.yml',
        service: 'node-exporter',
        tmpfsPath: '/host/root/opt/ads',
      },
      {
        file: 'docker-compose.observability.yml',
        service: 'cadvisor',
        tmpfsPath: '/rootfs/opt/ads',
      },
    ]);
  });

  it('accepts masks present via tmpfs with mode=000', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  node-exporter:',
        '    volumes:',
        '      - /:/host/root:ro',
        '    tmpfs:',
        '      - /host/root/opt/ads:size=1k,mode=000',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
        '    tmpfs:',
        '      - /rootfs/opt/ads:size=1k,mode=000',
      ].join('\n') + '\n'
    );

    expect(findMissingSecretsMasks('docker-compose.observability.yml', root)).toEqual([]);
  });

  it('flags a mask whose tmpfs options omit mode=000', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
        '    tmpfs:',
        // Readable by anyone — leaves the production secrets exposed,
        // contrary to the whole point of this mask.
        '      - /rootfs/opt/ads:size=1k,mode=755',
      ].join('\n') + '\n'
    );

    expect(findMissingSecretsMasks('docker-compose.observability.yml', root)).toEqual([
      {
        file: 'docker-compose.observability.yml',
        service: 'cadvisor',
        tmpfsPath: '/rootfs/opt/ads',
      },
    ]);
  });

  it('flags only the service missing its mask', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  node-exporter:',
        '    volumes:',
        '      - /:/host/root:ro',
        '    tmpfs:',
        '      - /host/root/opt/ads:size=1k,mode=000',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
      ].join('\n') + '\n'
    );

    expect(findMissingSecretsMasks('docker-compose.observability.yml', root)).toEqual([
      {
        file: 'docker-compose.observability.yml',
        service: 'cadvisor',
        tmpfsPath: '/rootfs/opt/ads',
      },
    ]);
  });

  it('returns nothing when neither service is present', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      ['services:', '  grafana:'].join('\n') + '\n'
    );

    expect(findMissingSecretsMasks('docker-compose.observability.yml', root)).toEqual([]);
  });

  it('still flags a missing mask when an unrelated list entry mentions the same path', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  cadvisor:',
        '    volumes:',
        '      - /:/rootfs:ro',
        // Not a real mask — this is a `command:` entry that happens to
        // contain the masked path as a substring, not a `tmpfs:` entry.
        '    command:',
        '      - --whitelisted-path=/rootfs/opt/ads:ro',
      ].join('\n') + '\n'
    );

    expect(findMissingSecretsMasks('docker-compose.observability.yml', root)).toEqual([
      {
        file: 'docker-compose.observability.yml',
        service: 'cadvisor',
        tmpfsPath: '/rootfs/opt/ads',
      },
    ]);
  });
});

describe('findUnsafeSocketProxyConfig', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'observability-mounts-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const ALLOWED_LOCATIONS = [
    'location ~ ^(/v[0-9][0-9.]*)?/_ping$ { limit_except GET { deny all; } proxy_pass http://docker_socket; }',
    'location ~ ^(/v[0-9][0-9.]*)?/version$ { limit_except GET { deny all; } proxy_pass http://docker_socket; }',
    'location ~ ^(/v[0-9][0-9.]*)?/info$ { limit_except GET { deny all; } proxy_pass http://docker_socket; }',
    'location ~ ^(/v[0-9][0-9.]*)?/containers/json$ { limit_except GET { deny all; } proxy_pass http://docker_socket; }',
    'location ~ ^(/v[0-9][0-9.]*)?/containers/[^/]+/json$ { limit_except GET { deny all; } proxy_pass http://docker_socket; }',
  ];
  const DENY_BY_DEFAULT = 'location / { return 403; }';
  // Every fixture needs its locations inside an actual `server {}` block —
  // findUnsafeSocketProxyConfig requires exactly one, so bare top-level
  // `location` lines (no wrapper) would fail every test on "found 0" before
  // ever reaching the behaviour each test means to exercise.
  const wrapInServer = lines => ['server {', 'listen 2375;', ...lines, '}'].join('\n');

  it('accepts an exact-path allow-list with no forbidden endpoints', () => {
    writeFileSync(
      join(root, 'server.conf'),
      wrapInServer([...ALLOWED_LOCATIONS, DENY_BY_DEFAULT]) + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([]);
  });

  it('flags a config missing one of the required endpoints', () => {
    writeFileSync(
      join(root, 'server.conf'),
      wrapInServer([...ALLOWED_LOCATIONS.slice(0, 4), DENY_BY_DEFAULT]) + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason: 'missing required endpoint: GET /containers/{id}/json (inspect -> name label)',
      },
    ]);
  });

  it('flags a config that also allows the archive endpoint (arbitrary file download)', () => {
    writeFileSync(
      join(root, 'server.conf'),
      wrapInServer([
        ...ALLOWED_LOCATIONS,
        // This is exactly the finding this check exists to catch: granting
        // read access wide enough to also cover GET /containers/{id}/archive.
        'location ~ ^(/v[0-9][0-9.]*)?/containers/[^/]+/archive$ { limit_except GET { deny all; } proxy_pass http://docker_socket; }',
        DENY_BY_DEFAULT,
      ]) + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason:
          'unexpected location `^(/v[0-9][0-9.]*)?/containers/[^/]+/archive$` — only the 5 documented endpoints may reach docker_socket',
      },
      { file: 'server.conf', reason: 'must not reference "archive"' },
    ]);
  });

  it('flags a broad /containers/ prefix location added alongside the 5 exact ones', () => {
    writeFileSync(
      join(root, 'server.conf'),
      wrapInServer([
        ...ALLOWED_LOCATIONS,
        // No forbidden keyword appears here at all — "containers" is
        // required by the legitimate locations too — so only the
        // exact-selector check catches this one.
        'location ~ ^/containers/ { proxy_pass http://docker_socket; }',
        DENY_BY_DEFAULT,
      ]) + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason:
          'unexpected location `^/containers/` — only the 5 documented endpoints may reach docker_socket',
      },
    ]);
  });

  it('flags a second server block adding its own, unchecked catch-all', () => {
    // Copilot's exact scenario: `expose` is not a firewall, so a second
    // `server` listening on a different port is still reachable, and its
    // `location /` would otherwise get silently merged into "the" deny
    // block by a parser that doesn't track which server each location
    // belongs to.
    writeFileSync(
      join(root, 'server.conf'),
      [
        wrapInServer([...ALLOWED_LOCATIONS, DENY_BY_DEFAULT]),
        'server {',
        'listen 2376;',
        'location / { proxy_pass http://docker_socket; }',
        '}',
      ].join('\n') + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason:
          'must define exactly one `server {}` block (found 2) — an extra one would add its own, unchecked catch-all',
      },
    ]);
  });

  it('flags a config missing the deny-by-default catch-all', () => {
    writeFileSync(join(root, 'server.conf'), wrapInServer(ALLOWED_LOCATIONS) + '\n');

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason:
          'the catch-all `location / { ... }` must be an unconditional `return 403;` and nothing else',
      },
    ]);
  });

  it('flags a catch-all that conditionally forwards unmatched GETs instead of always denying', () => {
    writeFileSync(
      join(root, 'server.conf'),
      wrapInServer([
        ...ALLOWED_LOCATIONS,
        // Technically "contains return 403", but only for POST — every
        // unmatched GET (including /containers/{id}/archive) still reaches
        // docker_socket. The guard must reject this, not just look for the
        // substring "return 403" anywhere in the catch-all's body.
        'location / { if ($request_method = POST) { return 403; } proxy_pass http://docker_socket; }',
      ]) + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason:
          'the catch-all `location / { ... }` must be an unconditional `return 403;` and nothing else',
      },
    ]);
  });

  it('flags an allowed-selector block that drops its proxy_pass', () => {
    writeFileSync(
      join(root, 'server.conf'),
      wrapInServer([
        ...ALLOWED_LOCATIONS.slice(0, 4),
        // Right selector, right method restriction — but cAdvisor gets no
        // response at all without proxy_pass, silently breaking the name
        // label this endpoint exists for.
        'location ~ ^(/v[0-9][0-9.]*)?/containers/[^/]+/json$ { limit_except GET { deny all; } }',
        DENY_BY_DEFAULT,
      ]) + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason:
          'location `^(/v[0-9][0-9.]*)?/containers/[^/]+/json$` must proxy_pass to docker_socket — cAdvisor gets no response otherwise',
      },
    ]);
  });

  it('flags a config missing limit_except GET on its allowed locations', () => {
    writeFileSync(
      join(root, 'server.conf'),
      wrapInServer([
        'location ~ ^(/v[0-9][0-9.]*)?/_ping$ { proxy_pass http://docker_socket; }',
        'location ~ ^(/v[0-9][0-9.]*)?/version$ { proxy_pass http://docker_socket; }',
        'location ~ ^(/v[0-9][0-9.]*)?/info$ { proxy_pass http://docker_socket; }',
        'location ~ ^(/v[0-9][0-9.]*)?/containers/json$ { proxy_pass http://docker_socket; }',
        'location ~ ^(/v[0-9][0-9.]*)?/containers/[^/]+/json$ { proxy_pass http://docker_socket; }',
        DENY_BY_DEFAULT,
      ]) + '\n'
    );

    const failures = findUnsafeSocketProxyConfig('server.conf', root);

    // Every one of the 5 locations lost its method restriction, and this
    // check verifies it per location, not "at least one exists somewhere".
    expect(failures).toHaveLength(5);
    expect(
      failures.every(f => f.reason.includes('must restrict itself to GET with limit_except'))
    ).toBe(true);
  });

  it('flags a config where only one location is missing limit_except GET', () => {
    writeFileSync(
      join(root, 'server.conf'),
      wrapInServer([
        ...ALLOWED_LOCATIONS.slice(0, 4),
        // Allowed selector, but no method restriction — distinguishable
        // from an *unexpected* location, which this isn't.
        'location ~ ^(/v[0-9][0-9.]*)?/containers/[^/]+/json$ { proxy_pass http://docker_socket; }',
        DENY_BY_DEFAULT,
      ]) + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason:
          'location `^(/v[0-9][0-9.]*)?/containers/[^/]+/json$` must restrict itself to GET with limit_except',
      },
    ]);
  });

  it('does not false-positive on explanatory comments naming the forbidden endpoints', () => {
    writeFileSync(
      join(root, 'server.conf'),
      [
        '# Unlike a prefix-based ACL, this never allows GET /containers/{id}/archive,',
        '# /exec, /secrets, /images, /volumes, /networks, /auth, /build or /swarm.',
        wrapInServer([...ALLOWED_LOCATIONS, DENY_BY_DEFAULT]),
      ].join('\n') + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([]);
  });

  it('flags a missing file as a failure, not an exemption', () => {
    // Compose requires server.conf to configure the only container with
    // access to the real docker.sock — deleting it entirely must fail this
    // guard, since the proxy would otherwise have no allow-list at all.
    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason: 'file is missing — docker-socket-proxy has no allow-list configured at all',
      },
    ]);
  });

  it('flags an allowed location that also rewrites the request to another path', () => {
    writeFileSync(
      join(root, 'server.conf'),
      wrapInServer([
        // Keeps both required substrings (limit_except GET, proxy_pass) —
        // a check that only confirms they're present would miss that this
        // silently redirects every /info request to /containers/json first.
        'location ~ ^(/v[0-9][0-9.]*)?/info$ { limit_except GET { deny all; } rewrite ^ /containers/json break; proxy_pass http://docker_socket; }',
        ...ALLOWED_LOCATIONS.filter(l => !l.includes('/info$')),
        DENY_BY_DEFAULT,
      ]) + '\n'
    );

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason:
          'location `^(/v[0-9][0-9.]*)?/info$` must contain only `limit_except GET { deny all; }` and `proxy_pass http://docker_socket;` — found an extra directive that could redirect or rewrite the request',
      },
    ]);
  });

  it('flags a server.conf missing its final closing brace instead of silently accepting it', () => {
    // Copilot's exact scenario: every location present and well-formed, but
    // the outer `server {` itself never closes. nginx would refuse to load
    // this; a brace-depth parser that takes whatever's left at EOF as "the
    // block's body" would not.
    const unterminated = [
      'server {',
      'listen 2375;',
      ...ALLOWED_LOCATIONS,
      DENY_BY_DEFAULT,
      // no closing `}` for the server block
    ].join('\n');
    writeFileSync(join(root, 'server.conf'), unterminated + '\n');

    expect(findUnsafeSocketProxyConfig('server.conf', root)).toEqual([
      {
        file: 'server.conf',
        reason: 'unterminated `server` block (missing closing `}`)',
      },
    ]);
  });
});

describe('findUnsafeMainNginxConfig', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'observability-mounts-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const MINIMAL_MAIN_CONF = [
    'user root;',
    'worker_processes 1;',
    'events { worker_connections 128; }',
    'http {',
    '  include /etc/nginx/conf.d/default.conf;',
    '}',
  ].join('\n');

  it('accepts a main config limited to `user root;` + the conf.d include', () => {
    writeFileSync(join(root, 'nginx.conf'), MINIMAL_MAIN_CONF + '\n');

    expect(findUnsafeMainNginxConfig('nginx.conf', root)).toEqual([]);
  });

  it('flags a server block defined directly in the main config, bypassing server.conf entirely', () => {
    writeFileSync(
      join(root, 'nginx.conf'),
      [
        'user root;',
        'events { worker_connections 128; }',
        'http {',
        '  include /etc/nginx/conf.d/default.conf;',
        // An unrestricted second server — none of the checks on server.conf
        // ever see this, since they only ever read that one file.
        '  server {',
        '    listen 2376;',
        '    location / { proxy_pass http://docker_socket; }',
        '  }',
        '}',
      ].join('\n') + '\n'
    );

    const failures = findUnsafeMainNginxConfig('nginx.conf', root);

    expect(failures).toEqual(
      expect.arrayContaining([
        {
          file: 'nginx.conf',
          reason: 'must not define a `server {}` block directly — only include conf.d/default.conf',
        },
        {
          file: 'nginx.conf',
          reason:
            'must not define a `location` directive directly — only include conf.d/default.conf',
        },
        {
          file: 'nginx.conf',
          reason:
            'must not define a `proxy_pass` directive directly — only include conf.d/default.conf',
        },
      ])
    );
  });

  it('flags a main config that wildcard-includes conf.d instead of naming default.conf', () => {
    // A `*.conf` glob would load *any* file a future Compose change mounts
    // into conf.d/, none of which either check-observability-mounts
    // function would ever see — the explicit filename is what closes that
    // off, so the glob form must be rejected, not merely "a wrong path".
    writeFileSync(
      join(root, 'nginx.conf'),
      [
        'user root;',
        'events { worker_connections 128; }',
        'http {',
        '  include /etc/nginx/conf.d/*.conf;',
        '}',
      ].join('\n') + '\n'
    );

    expect(findUnsafeMainNginxConfig('nginx.conf', root)).toEqual([
      {
        file: 'nginx.conf',
        reason:
          "must `include /etc/nginx/conf.d/default.conf;` — otherwise server.conf's allow-list never loads at all",
      },
    ]);
  });

  it('flags a main config that never includes conf.d/default.conf (server.conf would never load)', () => {
    writeFileSync(
      join(root, 'nginx.conf'),
      ['user root;', 'events { worker_connections 128; }', 'http {', '}'].join('\n') + '\n'
    );

    expect(findUnsafeMainNginxConfig('nginx.conf', root)).toEqual([
      {
        file: 'nginx.conf',
        reason:
          "must `include /etc/nginx/conf.d/default.conf;` — otherwise server.conf's allow-list never loads at all",
      },
    ]);
  });

  it('flags a main config missing `user root;` (the worker could never open docker.sock)', () => {
    writeFileSync(
      join(root, 'nginx.conf'),
      [
        'worker_processes 1;',
        'events { worker_connections 128; }',
        'http {',
        '  include /etc/nginx/conf.d/default.conf;',
        '}',
      ].join('\n') + '\n'
    );

    expect(findUnsafeMainNginxConfig('nginx.conf', root)).toEqual([
      {
        file: 'nginx.conf',
        reason:
          "must set `user root;` — the worker process can't open the root-owned docker.sock without it, silently disabling the proxy (and the name label it exists for)",
      },
    ]);
  });

  it('flags a missing file as a failure, not an exemption', () => {
    expect(findUnsafeMainNginxConfig('nginx.conf', root)).toEqual([
      {
        file: 'nginx.conf',
        reason: 'file is missing — docker-socket-proxy has no main nginx config at all',
      },
    ]);
  });

  it('flags a main config that keeps the required include but adds a second, unvalidated one', () => {
    // The required-include check only confirms default.conf's include is
    // present — it doesn't rule out `extra.conf` also being pulled in,
    // which this script never reads and could define its own server.
    writeFileSync(
      join(root, 'nginx.conf'),
      [
        'user root;',
        'events { worker_connections 128; }',
        'http {',
        '  include /etc/nginx/conf.d/default.conf;',
        '  include /etc/nginx/extra.conf;',
        '}',
      ].join('\n') + '\n'
    );

    expect(findUnsafeMainNginxConfig('nginx.conf', root)).toEqual([
      {
        file: 'nginx.conf',
        reason:
          'must contain exactly one `include` directive — an extra one can load a config this guard never reads',
      },
    ]);
  });
});

describe('findUnverifiedProxyConfigMounts', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'observability-mounts-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const CORRECT_PROXY_VOLUMES = [
    'services:',
    '  docker-socket-proxy:',
    '    volumes:',
    '      - /var/run/docker.sock:/var/run/docker.sock:ro',
    '      - ./observability/docker-socket-proxy/nginx.conf:/etc/nginx/nginx.conf:ro',
    '      - ./observability/docker-socket-proxy/server.conf:/etc/nginx/conf.d/default.conf:ro',
  ];

  it('accepts the two config files mounted at the exact paths the guard reads', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      CORRECT_PROXY_VOLUMES.join('\n') + '\n'
    );

    expect(findUnverifiedProxyConfigMounts('docker-compose.observability.yml', root)).toEqual([]);
  });

  it('flags server.conf mounted at a different target than nginx.conf includes', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  docker-socket-proxy:',
        '    volumes:',
        '      - /var/run/docker.sock:/var/run/docker.sock:ro',
        '      - ./observability/docker-socket-proxy/nginx.conf:/etc/nginx/nginx.conf:ro',
        // findUnsafeMainNginxConfig requires nginx.conf to `include
        // /etc/nginx/conf.d/default.conf;` — mounting server.conf
        // somewhere else means that include loads nothing this guard
        // validated at all, while the live proxy runs whatever's actually
        // there (or nothing, if the include target is empty).
        '      - ./observability/docker-socket-proxy/server.conf:/etc/nginx/conf.d/other.conf:ro',
      ].join('\n') + '\n'
    );

    expect(findUnverifiedProxyConfigMounts('docker-compose.observability.yml', root)).toEqual([
      {
        file: 'docker-compose.observability.yml',
        reason:
          "`docker-socket-proxy` must bind-mount ./observability/docker-socket-proxy/server.conf to /etc/nginx/conf.d/default.conf (found no mount at that target) — otherwise the file this guard checks isn't the one the live proxy actually runs",
      },
    ]);
  });

  it('flags nginx.conf mounted from a different, unvalidated source file', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      [
        'services:',
        '  docker-socket-proxy:',
        '    volumes:',
        '      - /var/run/docker.sock:/var/run/docker.sock:ro',
        '      - ./observability/docker-socket-proxy/nginx-alt.conf:/etc/nginx/nginx.conf:ro',
        '      - ./observability/docker-socket-proxy/server.conf:/etc/nginx/conf.d/default.conf:ro',
      ].join('\n') + '\n'
    );

    expect(findUnverifiedProxyConfigMounts('docker-compose.observability.yml', root)).toEqual([
      {
        file: 'docker-compose.observability.yml',
        reason:
          "`docker-socket-proxy` must bind-mount ./observability/docker-socket-proxy/nginx.conf to /etc/nginx/nginx.conf (found ./observability/docker-socket-proxy/nginx-alt.conf) — otherwise the file this guard checks isn't the one the live proxy actually runs",
      },
    ]);
  });

  it('flags a missing docker-socket-proxy service as unable to verify', () => {
    writeFileSync(
      join(root, 'docker-compose.observability.yml'),
      ['services:', '  cadvisor:', '    volumes:', '      - /:/rootfs:ro'].join('\n') + '\n'
    );

    expect(findUnverifiedProxyConfigMounts('docker-compose.observability.yml', root)).toEqual([
      {
        file: 'docker-compose.observability.yml',
        reason: 'service `docker-socket-proxy` not found — cannot verify its config mounts',
      },
    ]);
  });
});
