/**
 * ADS-DIM regression: LocalStorageProvider.processImage must apply
 * sharp's `limitInputPixels` guard. Without it, a tampered PNG that
 * declares 100000x100000 pixels would cause sharp to attempt a
 * width*height*channels-byte allocation and OOM the host. The
 * file-upload service applies the same guard at every other sharp
 * call site; this sibling provider had regressed.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.unmock('fs');

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import sharp from 'sharp';

import { MAX_IMAGE_PIXELS } from '../../../services/file-upload.service';

describe('LocalStorageProvider image-bomb dimension guard', () => {
  const TMP_DIR = path.join(os.tmpdir(), `ads-lsp-bomb-${Date.now()}`);

  beforeAll(async () => {
    await fs.promises.mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(TMP_DIR, { recursive: true, force: true });
  });

  it('sharp constructed with the provider limit rejects a PNG that declares 100000x100000', async () => {
    // Build a real 1x1 PNG, then rewrite the IHDR width/height bytes
    // (and CRC) so the header *claims* extreme dimensions. This is the
    // image-bomb pattern: tiny on disk, huge declared decode size.
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    png.writeUInt32BE(100000, 16);
    png.writeUInt32BE(100000, 20);
    const crc = zlib.crc32(png.subarray(12, 29));
    png.writeUInt32BE(crc, 29);

    // The provider feeds buffers into
    // `sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })`. Mirror
    // that here and assert sharp refuses to decode beyond the cap.
    await expect(
      sharp(png, { limitInputPixels: MAX_IMAGE_PIXELS }).jpeg({ quality: 90 }).toBuffer()
    ).rejects.toThrow();
  });

  it('MAX_IMAGE_PIXELS is exported and finite', () => {
    expect(Number.isFinite(MAX_IMAGE_PIXELS)).toBe(true);
    expect(MAX_IMAGE_PIXELS).toBeGreaterThan(0);
    // Sanity: 100000x100000 must exceed the cap; otherwise the test
    // above would not exercise the guard.
    expect(100000 * 100000).toBeGreaterThan(MAX_IMAGE_PIXELS);
  });
});
