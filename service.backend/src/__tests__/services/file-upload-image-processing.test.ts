import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// The shared test setup stubs `fs` for upstream service tests. This
// suite needs the real disk to write JPEG fixtures, so undo the mock.
vi.unmock('fs');

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';

import { FileUploadService } from '../../services/file-upload.service';

const TMP_ROOT = path.join(os.tmpdir(), `ads-518-${Date.now()}`);

let counter = 0;

const buildSyntheticUpload = async (
  originalWidth: number,
  originalHeight: number
): Promise<Express.Multer.File> => {
  await fs.promises.mkdir(TMP_ROOT, { recursive: true });
  counter += 1;
  const filename = `large-${Date.now()}-${counter}.jpg`;
  const filePath = path.join(TMP_ROOT, filename);
  // Synthesize a large solid-colour JPEG. JPEG of a flat colour
  // compresses to a small file, which is fine — we only care about
  // dimensions for the resize assertion. The point is that the
  // *input* dimensions exceed the 1600px bound.
  await sharp({
    create: {
      width: originalWidth,
      height: originalHeight,
      channels: 3,
      background: { r: 80, g: 120, b: 200 },
    },
  })
    .jpeg({ quality: 100 })
    .toFile(filePath);

  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: (await fs.promises.stat(filePath)).size,
    destination: TMP_ROOT,
    filename,
    path: filePath,
    buffer: Buffer.alloc(0),
    stream: null as never,
  };
};

describe('FileUploadService image processing [ADS-518]', () => {
  beforeAll(async () => {
    await fs.promises.mkdir(TMP_ROOT, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(TMP_ROOT, { recursive: true, force: true });
  });

  it('resizes images larger than 1600px and writes a thumbnail', async () => {
    const file = await buildSyntheticUpload(3200, 2400);

    const result = await FileUploadService.__processImageForTests(file);

    expect(result).not.toBeNull();
    if (!result) return;

    // The processed file replaces the original path; original is kept under .original.
    expect(result.processedPath).toBe(file.path);
    expect(result.originalPath).toBe(`${file.path}.original`);
    expect(result.thumbnailPath).toBeDefined();

    // Verify the resized image dimensions stay within the 1600px bound.
    const resizedMeta = await sharp(result.processedPath).metadata();
    expect(resizedMeta.width).toBeLessThanOrEqual(1600);
    expect(resizedMeta.height).toBeLessThanOrEqual(1600);

    // Thumbnail stays within 320px.
    if (result.thumbnailPath) {
      const thumbMeta = await sharp(result.thumbnailPath).metadata();
      expect(thumbMeta.width).toBeLessThanOrEqual(320);
      expect(thumbMeta.height).toBeLessThanOrEqual(320);
    }

    // The original is preserved on disk for re-derivation later.
    await fs.promises.access(result.originalPath);
  });

  it('does not enlarge images smaller than 1600px', async () => {
    const file = await buildSyntheticUpload(800, 600);

    const result = await FileUploadService.__processImageForTests(file);
    expect(result).not.toBeNull();
    if (!result) return;

    const meta = await sharp(result.processedPath).metadata();
    // Should remain at the original dimensions.
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600);
  });
});
