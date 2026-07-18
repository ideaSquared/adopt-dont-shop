import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findDockerfiles,
  findUnpinnedFromLines,
  findUnpinnedImages,
} from './check-docker-pinning.mjs';

describe('findUnpinnedImages (compose files)', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'docker-pinning-compose-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('flags a third-party image pinned by tag only', () => {
    writeFileSync(join(root, 'docker-compose.prod.yml'), '  image: postgres:16-alpine\n');

    const failures = findUnpinnedImages('docker-compose.prod.yml', root);

    expect(failures).toEqual([
      { file: 'docker-compose.prod.yml', line: 1, ref: 'postgres:16-alpine' },
    ]);
  });

  it('accepts a third-party image pinned by digest', () => {
    writeFileSync(
      join(root, 'docker-compose.prod.yml'),
      '  image: postgres:16-alpine@sha256:abc123\n'
    );

    expect(findUnpinnedImages('docker-compose.prod.yml', root)).toEqual([]);
  });

  it('skips first-party ghcr.io/ideasquared images (pinned by DEPLOY_SHA, not digest)', () => {
    writeFileSync(
      join(root, 'docker-compose.prod.yml'),
      '  image: ghcr.io/ideasquared/service.gateway:${DEPLOY_SHA}\n'
    );

    expect(findUnpinnedImages('docker-compose.prod.yml', root)).toEqual([]);
  });
});

describe('findUnpinnedFromLines (Dockerfiles)', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'docker-pinning-dockerfile-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('flags a third-party FROM pinned by tag only', () => {
    writeFileSync(join(root, 'Dockerfile.service'), 'FROM node:22.15.1-alpine AS base\n');

    const failures = findUnpinnedFromLines('Dockerfile.service', root);

    expect(failures).toEqual([
      { file: 'Dockerfile.service', line: 1, ref: 'node:22.15.1-alpine' },
    ]);
  });

  it('accepts a third-party FROM pinned by digest', () => {
    writeFileSync(
      join(root, 'Dockerfile.service'),
      'FROM node:22.15.1-alpine@sha256:abc123 AS base\n'
    );

    expect(findUnpinnedFromLines('Dockerfile.service', root)).toEqual([]);
  });

  it('skips internal stage references (FROM <earlier-stage> AS <name>)', () => {
    writeFileSync(
      join(root, 'Dockerfile.service'),
      [
        'FROM node:22.15.1-alpine@sha256:abc123 AS base',
        'FROM base AS pruner',
        'FROM base AS build',
      ].join('\n') + '\n'
    );

    expect(findUnpinnedFromLines('Dockerfile.service', root)).toEqual([]);
  });

  it('skips first-party ghcr.io/ideasquared images', () => {
    writeFileSync(
      join(root, 'Dockerfile.service'),
      'FROM ghcr.io/ideasquared/base-image:latest AS base\n'
    );

    expect(findUnpinnedFromLines('Dockerfile.service', root)).toEqual([]);
  });

  it('flags multiple unpinned third-party FROMs in one file', () => {
    writeFileSync(
      join(root, 'Dockerfile.multi'),
      ['FROM node:22.15.1-alpine AS base', 'FROM nginx:1.27-alpine AS runtime'].join('\n') + '\n'
    );

    const failures = findUnpinnedFromLines('Dockerfile.multi', root);

    expect(failures).toEqual([
      { file: 'Dockerfile.multi', line: 1, ref: 'node:22.15.1-alpine' },
      { file: 'Dockerfile.multi', line: 2, ref: 'nginx:1.27-alpine' },
    ]);
  });
});

describe('findDockerfiles', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'docker-pinning-discovery-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('discovers every Dockerfile* file at the given root', () => {
    writeFileSync(join(root, 'Dockerfile.app'), '');
    writeFileSync(join(root, 'Dockerfile.service'), '');
    writeFileSync(join(root, 'Dockerfile.dev'), '');
    writeFileSync(join(root, 'not-a-dockerfile.txt'), '');

    expect(findDockerfiles(root)).toEqual(['Dockerfile.app', 'Dockerfile.dev', 'Dockerfile.service']);
  });
});
