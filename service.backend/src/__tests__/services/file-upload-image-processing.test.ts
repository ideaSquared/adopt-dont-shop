import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// The shared test setup stubs `fs` for upstream service tests. This
// suite needs the real disk to write JPEG fixtures, so undo the mock.
vi.unmock('fs');

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import sharp from 'sharp';

import { FileUploadService } from '../../services/file-upload.service';
import { config } from '../../config';

const TMP_ROOT = path.join(os.tmpdir(), `ads-518-${Date.now()}`);

// `processFile` rejects paths outside `config.storage.local.directory`
// (defence-in-depth check added for the CodeQL `js/path-injection` rule).
// Synthetic uploads in this suite live under `os.tmpdir()`, so point the
// configured uploads root at TMP_ROOT for the duration of these tests
// and restore it afterwards. Production behaviour is unchanged.
const ORIGINAL_UPLOAD_DIR = config.storage.local.directory;

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
    config.storage.local.directory = TMP_ROOT;
  });

  afterAll(async () => {
    config.storage.local.directory = ORIGINAL_UPLOAD_DIR;
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

// Image-bomb DOS guard: a small-on-disk image with extreme decoded
// dimensions can blow up sharp's memory usage during decode. The fix
// inspects metadata and refuses any upload whose declared dimensions
// exceed MAX_IMAGE_DIMENSION before any decode/resize happens.
describe('FileUploadService image dimension guard (image-bomb DOS)', () => {
  const TMP_DIR = path.join(os.tmpdir(), `ads-image-bomb-${Date.now()}`);
  const ORIGINAL_DIR = config.storage.local.directory;

  beforeAll(async () => {
    await fs.promises.mkdir(TMP_DIR, { recursive: true });
    config.storage.local.directory = TMP_DIR;
  });

  afterAll(async () => {
    config.storage.local.directory = ORIGINAL_DIR;
    await fs.promises.rm(TMP_DIR, { recursive: true, force: true });
  });

  // Write a real 1x1 PNG to disk, then rewrite the IHDR width/height bytes
  // so the PNG header *claims* extreme dimensions. Sharp reads IHDR first;
  // this is the metadata-spoofed image-bomb pattern. We also recompute the
  // IHDR CRC32 so sharp's chunk-checksum validation accepts the tampered
  // header.
  const writeTamperedPng = async (
    width: number,
    height: number,
    name: string
  ): Promise<Express.Multer.File> => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    // PNG layout: signature(8) + IHDR_len(4) + IHDR_type(4) + IHDR_data(13) + CRC(4).
    // IHDR data starts at byte 16; first 8 bytes are width(uint32 BE) + height.
    png.writeUInt32BE(width, 16);
    png.writeUInt32BE(height, 20);
    // Recompute IHDR CRC32 over chunk_type (bytes 12-15) + chunk_data (16-28).
    const crc = zlib.crc32(png.subarray(12, 29));
    png.writeUInt32BE(crc, 29);

    const filePath = path.join(TMP_DIR, name);
    await fs.promises.writeFile(filePath, png);

    return {
      fieldname: 'file',
      originalname: name,
      encoding: '7bit',
      mimetype: 'image/png',
      size: png.length,
      destination: TMP_DIR,
      filename: name,
      path: filePath,
      buffer: Buffer.alloc(0),
      stream: null as never,
    };
  };

  it('rejects a PNG whose declared dimensions are extreme (50000x50000)', async () => {
    const file = await writeTamperedPng(50000, 50000, `bomb-50k-${Date.now()}.png`);

    await expect(FileUploadService.__assertImageDimensionsForTests(file)).rejects.toThrow();
  });

  it('rejects a PNG with one dimension just over the cap (8001x100)', async () => {
    const file = await writeTamperedPng(8001, 100, `bomb-8001x100-${Date.now()}.png`);

    await expect(FileUploadService.__assertImageDimensionsForTests(file)).rejects.toThrow(
      /dimension/i
    );
  });

  it('accepts a PNG under the cap (4000x4000)', async () => {
    // 4000x4000 is well under the 8000 cap; build a real (untampered) PNG so
    // sharp can read metadata cleanly.
    const filename = `ok-4000-${Date.now()}.png`;
    const filePath = path.join(TMP_DIR, filename);
    await sharp({
      create: { width: 4000, height: 4000, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toFile(filePath);

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'image/png',
      size: (await fs.promises.stat(filePath)).size,
      destination: TMP_DIR,
      filename,
      path: filePath,
      buffer: Buffer.alloc(0),
      stream: null as never,
    };

    await expect(FileUploadService.__assertImageDimensionsForTests(file)).resolves.toBeUndefined();
  });
});

// Privacy: re-encoded images served to other users must not carry EXIF
// from the upload. Camera-uploaded JPEGs commonly embed GPS coordinates;
// allowing those to round-trip into a served pet photo would let viewers
// extract the adopter's home coordinates.
describe('FileUploadService EXIF stripping on processed images', () => {
  const TMP_DIR = path.join(os.tmpdir(), `ads-exif-strip-${Date.now()}`);
  const ORIGINAL_DIR = config.storage.local.directory;

  beforeAll(async () => {
    await fs.promises.mkdir(TMP_DIR, { recursive: true });
    config.storage.local.directory = TMP_DIR;
  });

  afterAll(async () => {
    config.storage.local.directory = ORIGINAL_DIR;
    await fs.promises.rm(TMP_DIR, { recursive: true, force: true });
  });

  // Build a JPEG whose EXIF block carries GPS coordinates and a camera make.
  // sharp's withExif lets us inject EXIF on the *input* image so the
  // subsequent re-encode pipeline has something to strip (or accidentally
  // preserve).
  const buildJpegWithExif = async (name: string): Promise<Express.Multer.File> => {
    const filePath = path.join(TMP_DIR, name);
    await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .withExif({
        IFD0: { Make: 'TestCam', Model: 'PrivacyLeak' },
        GPSIFD: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '51/1, 30/1, 0/1',
          GPSLongitudeRef: 'W',
          GPSLongitude: '0/1, 7/1, 0/1',
        },
      })
      .jpeg({ quality: 90 })
      .toFile(filePath);

    return {
      fieldname: 'file',
      originalname: name,
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: (await fs.promises.stat(filePath)).size,
      destination: TMP_DIR,
      filename: name,
      path: filePath,
      buffer: Buffer.alloc(0),
      stream: null as never,
    };
  };

  it('strips EXIF from the resized primary image and the thumbnail', async () => {
    const file = await buildJpegWithExif(`exif-input-${Date.now()}.jpg`);

    // Sanity: the synthetic input must actually carry the EXIF we just
    // injected, otherwise the assertion below would be trivially true.
    const inputMeta = await sharp(file.path).metadata();
    expect(inputMeta.exif).toBeDefined();

    const result = await FileUploadService.__processImageForTests(file);
    expect(result).not.toBeNull();
    if (!result) return;

    const resizedMeta = await sharp(result.processedPath).metadata();
    expect(resizedMeta.exif).toBeUndefined();

    if (result.thumbnailPath) {
      const thumbMeta = await sharp(result.thumbnailPath).metadata();
      expect(thumbMeta.exif).toBeUndefined();
    }
  });
});
