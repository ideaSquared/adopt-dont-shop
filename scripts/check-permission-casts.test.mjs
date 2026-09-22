import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findGrpcFiles,
  findPermissionCasts,
  scanPermissionCasts,
} from './check-permission-casts.mjs';

describe('findPermissionCasts', () => {
  it('returns nothing for a clean file', () => {
    expect(
      findPermissionCasts("import { PETS_VIEW } from '@adopt-dont-shop/lib.types';\n")
    ).toEqual([]);
  });

  it('flags a single-quoted literal cast to Permission', () => {
    expect(findPermissionCasts("const X: Permission = 'pets.read' as Permission;\n")).toEqual([1]);
  });

  it('flags a double-quoted literal cast to Permission', () => {
    expect(findPermissionCasts('const X: Permission = "pets.read" as Permission;\n')).toEqual([1]);
  });

  it('reports the correct line number for a cast buried in a file', () => {
    const src = [
      'const a = 1;',
      "const CHAT_READ: Permission = 'chats.read' as Permission;",
      'const b = 2;',
    ].join('\n');

    expect(findPermissionCasts(src)).toEqual([2]);
  });

  it('flags multiple casts on separate lines', () => {
    const src = [
      "const A: Permission = 'pets.create' as Permission;",
      "const B: Permission = 'pets.read' as Permission;",
    ].join('\n');

    expect(findPermissionCasts(src)).toEqual([1, 2]);
  });

  it('does not flag a dynamic value cast (e.g. a DB row mapping)', () => {
    expect(
      findPermissionCasts('const permissions = rows.map(r => r.name as Permission);\n')
    ).toEqual([]);
  });

  it('does not flag an array-type assertion', () => {
    expect(findPermissionCasts('permissions: [] as Permission[],\n')).toEqual([]);
  });

  it('does not flag prose mentioning the pattern in a comment about something else', () => {
    expect(findPermissionCasts("// see the '...' as Permission pattern\n")).toEqual([]);
  });
});

describe('findGrpcFiles', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'check-permission-casts-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('finds .ts files under a service src/grpc directory', () => {
    mkdirSync(join(root, 'pets', 'src', 'grpc'), { recursive: true });
    writeFileSync(join(root, 'pets', 'src', 'grpc', 'handlers.ts'), 'export {};\n');

    expect(findGrpcFiles(root)).toEqual([join('pets', 'src', 'grpc', 'handlers.ts')]);
  });

  it('excludes test files', () => {
    mkdirSync(join(root, 'pets', 'src', 'grpc'), { recursive: true });
    writeFileSync(join(root, 'pets', 'src', 'grpc', 'handlers.test.ts'), 'export {};\n');

    expect(findGrpcFiles(root)).toEqual([]);
  });

  it('excludes files outside a grpc directory', () => {
    mkdirSync(join(root, 'pets', 'src', 'routes'), { recursive: true });
    writeFileSync(join(root, 'pets', 'src', 'routes', 'handlers.ts'), 'export {};\n');

    expect(findGrpcFiles(root)).toEqual([]);
  });

  it('skips node_modules', () => {
    mkdirSync(join(root, 'pets', 'node_modules', 'grpc'), { recursive: true });
    writeFileSync(join(root, 'pets', 'node_modules', 'grpc', 'x.ts'), 'export {};\n');

    expect(findGrpcFiles(root)).toEqual([]);
  });

  it('finds nested files under a grpc directory', () => {
    mkdirSync(join(root, 'pets', 'src', 'grpc', 'nested'), { recursive: true });
    writeFileSync(join(root, 'pets', 'src', 'grpc', 'nested', 'handlers.ts'), 'export {};\n');

    expect(findGrpcFiles(root)).toEqual([join('pets', 'src', 'grpc', 'nested', 'handlers.ts')]);
  });
});

describe('scanPermissionCasts', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'check-permission-casts-scan-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('passes when no grpc file has a permission cast', () => {
    mkdirSync(join(root, 'pets', 'src', 'grpc'), { recursive: true });
    writeFileSync(
      join(root, 'pets', 'src', 'grpc', 'handlers.ts'),
      "import { PETS_VIEW } from '@adopt-dont-shop/lib.types';\n"
    );

    expect(scanPermissionCasts(root)).toEqual([]);
  });

  it('flags a cast with its file and line', () => {
    mkdirSync(join(root, 'chat', 'src', 'grpc'), { recursive: true });
    writeFileSync(
      join(root, 'chat', 'src', 'grpc', 'handlers.ts'),
      ['const OK = 1;', "const CHAT_SEND: Permission = 'messages.create' as Permission;"].join(
        '\n'
      ) + '\n'
    );

    expect(scanPermissionCasts(root)).toEqual([
      { file: join('chat', 'src', 'grpc', 'handlers.ts'), line: 2 },
    ]);
  });

  it('does not flag a permission cast inside a test file', () => {
    mkdirSync(join(root, 'chat', 'src', 'grpc'), { recursive: true });
    writeFileSync(
      join(root, 'chat', 'src', 'grpc', 'handlers.test.ts'),
      "permissions: ['chats.read' as Permission],\n"
    );

    expect(scanPermissionCasts(root)).toEqual([]);
  });
});
