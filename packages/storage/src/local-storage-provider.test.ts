import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { StorageCategory } from './base-provider.js';
import { LocalStorageProvider } from './local-storage-provider.js';
import type { LocalStorageConfig } from './config.js';

const makeConfig = (directory: string): LocalStorageConfig => ({
  directory,
  publicPath: '/uploads',
});

// A minimal valid 1x1 PNG so sharp has real image bytes to process.
const ONE_BY_ONE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC',
  'base64'
);

describe('LocalStorageProvider', () => {
  let dir: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'storage-local-'));
    provider = new LocalStorageProvider(makeConfig(dir));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes an uploaded file and returns url, filename and size with the public path', async () => {
    const result = await provider.uploadFile(ONE_BY_ONE_PNG, 'cat.png', 'image/png', 'pets');

    expect(result.filename).toMatch(/\.png$/);
    expect(result.url).toBe(`/uploads/pets/${result.filename}`);
    expect(result.size).toBeGreaterThan(0);

    const onDisk = await readFile(path.join(dir, 'pets', result.filename));
    expect(onDisk.length).toBe(result.size);
  });

  it('stores a PDF untouched without running it through image processing', async () => {
    const pdfBytes = Buffer.from('%PDF-1.4 fake pdf body', 'utf8');

    const result = await provider.uploadFile(pdfBytes, 'form.pdf', 'application/pdf', 'documents');

    expect(result.size).toBe(pdfBytes.length);
    const onDisk = await readFile(path.join(dir, 'documents', result.filename));
    expect(onDisk.equals(pdfBytes)).toBe(true);
  });

  it('reports file info for an existing file and absence for a missing one', async () => {
    const result = await provider.uploadFile(ONE_BY_ONE_PNG, 'cat.png', 'image/png', 'pets');

    const info = await provider.getFileInfo(result.filename, 'pets');
    expect(info.exists).toBe(true);
    if (info.exists) {
      expect(info.size).toBe(result.size);
      expect(info.modified).toBeInstanceOf(Date);
    }

    const missing = await provider.getFileInfo('nope.png', 'pets');
    expect(missing.exists).toBe(false);
  });

  it('deletes a file', async () => {
    await mkdir(path.join(dir, 'documents'), { recursive: true });
    const target = path.join(dir, 'documents', 'gone.txt');
    await writeFile(target, 'bye');

    await provider.deleteFile('gone.txt', 'documents');

    const info = await provider.getFileInfo('gone.txt', 'documents');
    expect(info.exists).toBe(false);
  });

  it('rejects path-traversal in filename or category instead of escaping the upload dir', async () => {
    await expect(provider.deleteFile('../../etc/passwd', 'documents')).rejects.toThrow(/unsafe/);
    await expect(provider.getFileInfo('ok.txt', '../secrets')).rejects.toThrow(/unsafe/);
    await expect(provider.getFileInfo('a/b.txt', 'documents')).rejects.toThrow(/unsafe/);
  });

  it.each(['../escape', 'a/b', 'a\\b', '..', ''])(
    'rejects an unsafe upload category %j and writes nothing outside the upload dir',
    async category => {
      const parent = path.dirname(dir);
      const before = await readdir(parent);

      await expect(
        // Deliberately bypasses the StorageCategory union to model a future caller forwarding user input.
        provider.uploadFile(
          Buffer.from('x'),
          'a.txt',
          'text/plain',
          // Assertion is deliberate: models a future caller bypassing the union.
          category as StorageCategory
        )
      ).rejects.toThrow(/unsafe/);

      expect(await readdir(parent)).toEqual(before);
      expect(await readdir(dir)).toEqual([]);
    }
  );

  it('rejects an image that cannot be decoded instead of storing the original bytes', async () => {
    const notAnImage = Buffer.from('not really an image');

    await expect(provider.uploadFile(notAnImage, 'bad.png', 'image/png', 'pets')).rejects.toThrow();

    expect(await readdir(path.join(dir, 'pets')).catch(() => [])).toEqual([]);
  });

  it('identifies itself and does not support signed urls', async () => {
    expect(provider.getName()).toBe('local');
    expect(provider.supportsSignedUrls()).toBe(false);
    expect(provider.validateConfiguration()).toBe(true);
  });

  it('throws when asked for a signed url', async () => {
    await expect(provider.getSignedUrl()).rejects.toThrow(/does not generate signed URLs/);
  });
});
