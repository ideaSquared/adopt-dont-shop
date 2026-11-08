import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COMPOSE_FILES, findUploadDirMismatch } from './check-gateway-upload-dir.mjs';

describe('the real prod and staging compose files', () => {
  it.each(COMPOSE_FILES)('%s points UPLOAD_DIR at the gateway uploads mount', file => {
    expect(findUploadDirMismatch(file)).toBeUndefined();
  });
});

describe('findUploadDirMismatch', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'gateway-upload-dir-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const compose = ({ env = '', mount = '      - uploads:/app/uploads' } = {}) =>
    [
      'services:',
      '  service-gateway:',
      '    environment:',
      '      LOG_LEVEL: info',
      env,
      '    volumes:',
      mount,
      '  service-auth:',
      '    environment:',
      '      UPLOAD_DIR: /elsewhere',
      '',
    ].join('\n');

  const check = content => {
    writeFileSync(join(root, 'c.yml'), content);
    return findUploadDirMismatch('c.yml', root);
  };

  it('passes when UPLOAD_DIR equals the mount path', () => {
    expect(check(compose({ env: '      UPLOAD_DIR: /app/uploads' }))).toBeUndefined();
  });

  it('fails when UPLOAD_DIR is unset (the relative default hits the read-only rootfs)', () => {
    expect(check(compose())).toEqual({
      file: 'c.yml',
      mount: '/app/uploads',
      uploadDir: undefined,
    });
  });

  it('fails when UPLOAD_DIR differs from the mount path', () => {
    expect(check(compose({ env: '      UPLOAD_DIR: /tmp/uploads' }))).toMatchObject({
      mount: '/app/uploads',
      uploadDir: '/tmp/uploads',
    });
  });

  it('ignores UPLOAD_DIR set on other services', () => {
    expect(check(compose())?.uploadDir).toBeUndefined();
  });

  it('passes when the gateway does not mount uploads', () => {
    expect(check(compose({ mount: '      - other:/data' }))).toBeUndefined();
  });
});
