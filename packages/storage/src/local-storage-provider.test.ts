import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
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
  // The upload dir lives inside a private temp root so tests only ever inspect
  // their own tree, never the shared system temp dir.
  let root: string;
  let dir: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'storage-local-'));
    dir = path.join(root, 'uploads');
    await mkdir(dir);
    provider = new LocalStorageProvider(makeConfig(dir));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
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

      expect(await readdir(root)).toEqual(['uploads']);
      expect(await readdir(dir)).toEqual([]);
    }
  );

  it('rejects an image that cannot be decoded instead of storing the original bytes', async () => {
    const notAnImage = Buffer.from('not really an image');

    await expect(provider.uploadFile(notAnImage, 'bad.png', 'image/png', 'pets')).rejects.toThrow();

    expect(await readdir(path.join(dir, 'pets')).catch(() => [])).toEqual([]);
  });

  it('re-encodes a small JPEG so embedded EXIF metadata is stripped', async () => {
    const withExif = await sharp({
      create: { width: 64, height: 64, channels: 3, background: '#ff0000' },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: 'private-gps-owner' } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const result = await provider.uploadFile(withExif, 'photo.jpg', 'image/jpeg', 'pets');

    const stored = await readFile(path.join(dir, 'pets', result.filename));
    const metadata = await sharp(stored).metadata();
    expect(metadata.format).toBe('jpeg');
    expect(metadata.exif).toBeUndefined();
  });

  it('rejects a small JPEG with a readable header but corrupt pixel data', async () => {
    const valid = await sharp({
      create: {
        width: 800,
        height: 800,
        channels: 3,
        background: '#000000',
        noise: { type: 'gaussian', mean: 128, sigma: 60 },
      },
    })
      .jpeg()
      .toBuffer();
    const corrupt = Buffer.from(valid.subarray(0, valid.length >> 1));
    expect((await sharp(corrupt).metadata()).width).toBe(800);

    await expect(provider.uploadFile(corrupt, 'bad.jpg', 'image/jpeg', 'pets')).rejects.toThrow();

    expect(await readdir(path.join(dir, 'pets')).catch(() => [])).toEqual([]);
  });

  it('auto-orients a JPEG from its EXIF orientation before stripping the metadata', async () => {
    const sideways = await sharp({
      create: { width: 20, height: 10, channels: 3, background: '#00ff00' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(sideways).metadata()).orientation).toBe(6);

    const result = await provider.uploadFile(sideways, 'portrait.jpg', 'image/jpeg', 'pets');

    const stored = await readFile(path.join(dir, 'pets', result.filename));
    const metadata = await sharp(stored).metadata();
    expect({ width: metadata.width, height: metadata.height }).toEqual({ width: 10, height: 20 });
    expect(metadata.orientation).toBeUndefined();
  });

  it('downscales by the oriented width when EXIF orientation swaps a narrow raw width over the limit', async () => {
    const sideways = await sharp({
      create: { width: 1500, height: 2500, channels: 3, background: '#0000ff' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await provider.uploadFile(sideways, 'wide.jpg', 'image/jpeg', 'pets');

    const stored = await readFile(path.join(dir, 'pets', result.filename));
    const metadata = await sharp(stored).metadata();
    expect(metadata.width).toBeLessThanOrEqual(1920);
    expect(metadata.height).toBeLessThanOrEqual(1080);
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
