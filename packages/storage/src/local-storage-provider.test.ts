import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageProvider } from './local-storage-provider.js';
import type { LocalStorageConfig } from './config.js';

const makeConfig = (directory: string): LocalStorageConfig => ({
  directory,
  publicPath: '/uploads',
});

// A minimal valid 1x1 PNG so sharp has real image bytes to process.
const ONE_BY_ONE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
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

  it('identifies itself and does not support signed urls', async () => {
    expect(provider.getName()).toBe('local');
    expect(provider.supportsSignedUrls()).toBe(false);
    expect(provider.validateConfiguration()).toBe(true);
  });

  it('throws when asked for a signed url', async () => {
    await expect(provider.getSignedUrl()).rejects.toThrow(/does not generate signed URLs/);
  });
});
