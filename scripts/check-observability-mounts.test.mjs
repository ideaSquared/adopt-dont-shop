import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  COMPOSE_FILE,
  findCadvisorUnsafeMounts,
  findMissingSecretsMasks,
} from './check-observability-mounts.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('the real docker-compose.observability.yml (ADS-1376)', () => {
  it('finds no unsafe cAdvisor host-socket mount', () => {
    expect(findCadvisorUnsafeMounts(COMPOSE_FILE, REPO_ROOT)).toEqual([]);
  });

  it('masks /opt/ads in both node-exporter and cadvisor', () => {
    expect(findMissingSecretsMasks(COMPOSE_FILE, REPO_ROOT)).toEqual([]);
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
      { file: 'docker-compose.observability.yml', line: 5, mount: '/var/run:/var/run:ro' },
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

  it('accepts masks present via tmpfs', () => {
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
});
