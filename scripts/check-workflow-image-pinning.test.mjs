import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findUnpinnedDockerRunImages,
  findUnpinnedServiceImages,
  listWorkflowFiles,
} from './check-workflow-image-pinning.mjs';

describe('real .github/workflows files (ADS-1341)', () => {
  it('finds no unpinned image: key or docker run image in any real workflow file', () => {
    // Guards the ADS-1341 fix directly: schema-equivalence.yml's postgis
    // service container and docker.yml's Trivy `docker run` invocations are
    // now digest-pinned, so a future bare-tag edit fails CI here.
    const failures = listWorkflowFiles().flatMap(file => [
      ...findUnpinnedServiceImages(file),
      ...findUnpinnedDockerRunImages(file),
    ]);
    expect(failures).toEqual([]);
  });
});

describe('findUnpinnedServiceImages', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'workflow-pinning-services-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('flags a services: image pinned by tag only', () => {
    writeFileSync(
      join(root, 'ci.yml'),
      [
        'jobs:',
        '  test:',
        '    services:',
        '      postgres:',
        '        image: postgis/postgis:16-3.4',
        '',
      ].join('\n')
    );

    expect(findUnpinnedServiceImages('ci.yml', root)).toEqual([
      { file: 'ci.yml', line: 5, ref: 'postgis/postgis:16-3.4' },
    ]);
  });

  it('accepts a services: image pinned by digest', () => {
    writeFileSync(
      join(root, 'ci.yml'),
      '        image: postgis/postgis:16-3.4@sha256:44126d872ac91993766c341e369c539e8196614321765d36a6f1bab0419a5fa5\n'
    );

    expect(findUnpinnedServiceImages('ci.yml', root)).toEqual([]);
  });

  it('skips first-party ghcr.io/ideasquared images', () => {
    writeFileSync(join(root, 'ci.yml'), '        image: ghcr.io/ideasquared/dev:latest\n');

    expect(findUnpinnedServiceImages('ci.yml', root)).toEqual([]);
  });
});

describe('findUnpinnedDockerRunImages', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'workflow-pinning-docker-run-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('flags a single-line docker run image pinned by tag only', () => {
    writeFileSync(
      join(root, 'docker.yml'),
      '          docker run --rm aquasec/trivy:0.63.0 image\n'
    );

    expect(findUnpinnedDockerRunImages('docker.yml', root)).toEqual([
      { file: 'docker.yml', line: 1, ref: 'aquasec/trivy:0.63.0' },
    ]);
  });

  it('flags a multi-line, backslash-continued docker run image (the real Trivy shape)', () => {
    writeFileSync(
      join(root, 'docker.yml'),
      [
        '          docker run --rm \\',
        '            -v "$PWD:/workspace" -w /workspace \\',
        '            -e TRIVY_DB_REPOSITORY=public.ecr.aws/aquasecurity/trivy-db:2 \\',
        '            aquasec/trivy:0.63.0 image \\',
        '              --severity CRITICAL,HIGH',
        '',
      ].join('\n')
    );

    expect(findUnpinnedDockerRunImages('docker.yml', root)).toEqual([
      { file: 'docker.yml', line: 4, ref: 'aquasec/trivy:0.63.0' },
    ]);
  });

  it('flags each of several separate docker run invocations in one file', () => {
    writeFileSync(
      join(root, 'docker.yml'),
      [
        '          docker run --rm -v "$PWD:/workspace" -w /workspace \\',
        '            aquasec/trivy:0.63.0 convert --format table \\',
        '              trivy-results.json',
        '          docker run --rm -v "$PWD:/workspace" -w /workspace \\',
        '            aquasec/trivy:0.63.0 convert --format sarif \\',
        '              trivy-results.json',
        '',
      ].join('\n')
    );

    expect(findUnpinnedDockerRunImages('docker.yml', root)).toEqual([
      { file: 'docker.yml', line: 2, ref: 'aquasec/trivy:0.63.0' },
      { file: 'docker.yml', line: 5, ref: 'aquasec/trivy:0.63.0' },
    ]);
  });

  it('accepts a docker run image pinned by digest, including across continuation lines', () => {
    writeFileSync(
      join(root, 'ci.yml'),
      [
        '          docker run --rm --entrypoint sh \\',
        '            -v "$PWD/infra/prometheus/rules:/rules:ro" \\',
        '            prom/prometheus:v3.1.0@sha256:6559acbd5d770b15bb3c954629ce190ac3cbbdb2b7f1c30f0385c4e05104e218 \\',
        "            -c 'promtool check rules /rules/*.yml'",
        '',
      ].join('\n')
    );

    expect(findUnpinnedDockerRunImages('ci.yml', root)).toEqual([]);
  });

  it('skips first-party ghcr.io/ideasquared images', () => {
    writeFileSync(
      join(root, 'docker.yml'),
      '          docker run --rm ghcr.io/ideasquared/adopt-dont-shop/dev:latest echo hi\n'
    );

    expect(findUnpinnedDockerRunImages('docker.yml', root)).toEqual([]);
  });

  it('finds no image token (and does not crash) for a purely variable-based docker run', () => {
    writeFileSync(
      join(root, 'deploy.yml'),
      '              docker run --rm "$IMAGE_PREFIX/$image:$SHA"\n'
    );

    expect(findUnpinnedDockerRunImages('deploy.yml', root)).toEqual([]);
  });
});

describe('listWorkflowFiles', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'workflow-pinning-discovery-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('discovers every .yml/.yaml file at the given directory, ignoring others', () => {
    writeFileSync(join(root, 'ci.yml'), '');
    writeFileSync(join(root, 'docker.yml'), '');
    writeFileSync(join(root, 'quality.yaml'), '');
    writeFileSync(join(root, 'README.md'), '');

    expect(listWorkflowFiles(root)).toEqual(['ci.yml', 'docker.yml', 'quality.yaml']);
  });
});
