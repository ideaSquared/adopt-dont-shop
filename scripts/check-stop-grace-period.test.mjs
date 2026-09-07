import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  COMPOSE_FILE,
  findAnchorsWithStopGracePeriod,
  findServicesMissingStopGracePeriod,
} from './check-stop-grace-period.mjs';

describe('the real docker-compose.prod.yml (ADS-1309)', () => {
  it('has no service-* entry missing stop_grace_period', () => {
    expect(findServicesMissingStopGracePeriod(COMPOSE_FILE)).toEqual([]);
  });
});

describe('findAnchorsWithStopGracePeriod', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'stop-grace-anchors-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('marks an anchor true when its block declares stop_grace_period', () => {
    writeFileSync(
      join(root, 'docker-compose.prod.yml'),
      [
        'x-service-common: &service-common',
        '  restart: always',
        '  stop_grace_period: 30s',
        '',
      ].join('\n')
    );

    const anchors = findAnchorsWithStopGracePeriod('docker-compose.prod.yml', root);
    expect(anchors.get('service-common')).toBe(true);
  });

  it('marks an anchor false when its block does not declare stop_grace_period', () => {
    writeFileSync(
      join(root, 'docker-compose.prod.yml'),
      ['x-service-common: &service-common', '  restart: always', ''].join('\n')
    );

    const anchors = findAnchorsWithStopGracePeriod('docker-compose.prod.yml', root);
    expect(anchors.get('service-common')).toBe(false);
  });

  it('stops attributing lines to the anchor once a new top-level key starts', () => {
    writeFileSync(
      join(root, 'docker-compose.prod.yml'),
      [
        'x-service-common: &service-common',
        '  restart: always',
        'x-app-common: &app-common',
        '  stop_grace_period: 30s',
        '',
      ].join('\n')
    );

    const anchors = findAnchorsWithStopGracePeriod('docker-compose.prod.yml', root);
    expect(anchors.get('service-common')).toBe(false);
    expect(anchors.get('app-common')).toBe(true);
  });
});

describe('findServicesMissingStopGracePeriod', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'stop-grace-services-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const write = content => writeFileSync(join(root, 'docker-compose.prod.yml'), content);

  it('passes a service-* entry that declares stop_grace_period directly', () => {
    write(
      [
        'services:',
        '  service-gateway:',
        '    image: example',
        '    stop_grace_period: 30s',
        '',
      ].join('\n')
    );

    expect(findServicesMissingStopGracePeriod('docker-compose.prod.yml', root)).toEqual([]);
  });

  it('passes a service-* entry that merges an anchor which declares it', () => {
    write(
      [
        'x-service-common: &service-common',
        '  restart: always',
        '  stop_grace_period: 30s',
        '',
        'services:',
        '  service-gateway:',
        '    <<: *service-common',
        '    image: example',
        '',
      ].join('\n')
    );

    expect(findServicesMissingStopGracePeriod('docker-compose.prod.yml', root)).toEqual([]);
  });

  it('flags a service-* entry with no direct declaration and no covering anchor merge', () => {
    write(
      [
        'x-service-common: &service-common',
        '  restart: always',
        '',
        'services:',
        '  service-gateway:',
        '    <<: *service-common',
        '    image: example',
        '',
      ].join('\n')
    );

    expect(findServicesMissingStopGracePeriod('docker-compose.prod.yml', root)).toEqual([
      { file: 'docker-compose.prod.yml', service: 'service-gateway' },
    ]);
  });

  it('ignores non-service-* entries (infra containers, apps, nginx)', () => {
    write(
      ['services:', '  database:', '    image: postgres', '  nginx:', '    image: nginx', ''].join(
        '\n'
      )
    );

    expect(findServicesMissingStopGracePeriod('docker-compose.prod.yml', root)).toEqual([]);
  });

  it('stops scanning a service block once the next service or the services map ends', () => {
    write(
      [
        'x-service-common: &service-common',
        '  restart: always',
        '  stop_grace_period: 30s',
        '',
        'services:',
        '  service-gateway:',
        '    image: example',
        '  service-auth:',
        '    <<: *service-common',
        '    image: example',
        'volumes:',
        '  postgres_data:',
        '',
      ].join('\n')
    );

    expect(findServicesMissingStopGracePeriod('docker-compose.prod.yml', root)).toEqual([
      { file: 'docker-compose.prod.yml', service: 'service-gateway' },
    ]);
  });
});
