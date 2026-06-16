import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { verifyUploadContent } from './upload-content-checks.js';

// Minimal real file headers so file-type's magic-byte sniffer recognises them.
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF_HEADER = Buffer.from('%PDF-1.4\n%âãÏÓ\n', 'binary');

// A genuine, small PNG produced by sharp — used so both the magic-byte AND
// the sharp dimension checks run against real bytes.
async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .png()
    .toBuffer();
}

const IMAGE_ALLOWLIST = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const DOC_ALLOWLIST = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

describe('verifyUploadContent — magic-byte verification (ADS-848 step 1)', () => {
  it('passes a genuine PNG whose declared MIME + extension match the bytes', async () => {
    const buffer = await makePng(8, 8);
    const result = await verifyUploadContent({
      buffer,
      declaredMime: 'image/png',
      extension: '.png',
      allowedMimes: IMAGE_ALLOWLIST,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a file whose sniffed type contradicts the declared MIME', async () => {
    // A real PDF body uploaded while CLAIMING to be a PNG image.
    const result = await verifyUploadContent({
      buffer: PDF_HEADER,
      declaredMime: 'image/png',
      extension: '.png',
      allowedMimes: IMAGE_ALLOWLIST,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/content does not match/i);
    }
  });

  it('rejects an executable smuggled behind an image extension + MIME', async () => {
    // PE/EXE header ("MZ") — file-type detects application/x-msdownload, which
    // is not in the image allowlist.
    const exe = Buffer.concat([Buffer.from([0x4d, 0x5a]), Buffer.alloc(64, 0)]);
    const result = await verifyUploadContent({
      buffer: exe,
      declaredMime: 'image/png',
      extension: '.png',
      allowedMimes: IMAGE_ALLOWLIST,
    });
    expect(result.ok).toBe(false);
  });

  it('accepts a genuine PDF in the document allowlist', async () => {
    const result = await verifyUploadContent({
      buffer: PDF_HEADER,
      declaredMime: 'application/pdf',
      extension: '.pdf',
      allowedMimes: DOC_ALLOWLIST,
    });
    expect(result.ok).toBe(true);
  });

  it('passes through when the sniffer cannot determine a type (e.g. legacy .doc)', async () => {
    // file-type returns undefined for many plain/old container formats. We
    // must not reject on "unknown" — the MIME + extension allowlists already
    // gate those upstream. Use bytes file-type cannot classify.
    const unknown = Buffer.from('plain text that file-type does not recognise');
    const result = await verifyUploadContent({
      buffer: unknown,
      declaredMime: 'application/msword',
      extension: '.doc',
      allowedMimes: DOC_ALLOWLIST,
    });
    expect(result.ok).toBe(true);
  });
});

describe('verifyUploadContent — image-bomb guard (ADS-848 step 2)', () => {
  it('rejects an image whose decoded pixel count exceeds the cap', async () => {
    const buffer = await makePng(8, 8);
    const result = await verifyUploadContent({
      buffer,
      declaredMime: 'image/png',
      extension: '.png',
      allowedMimes: IMAGE_ALLOWLIST,
      // 8x8 = 64 px > 10 px cap.
      maxPixels: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/dimensions/i);
    }
  });

  it('accepts an image within the pixel cap', async () => {
    const buffer = await makePng(8, 8);
    const result = await verifyUploadContent({
      buffer,
      declaredMime: 'image/png',
      extension: '.png',
      allowedMimes: IMAGE_ALLOWLIST,
      maxPixels: 1000,
    });
    expect(result.ok).toBe(true);
  });

  it('does not apply the dimension guard to non-image documents', async () => {
    const result = await verifyUploadContent({
      buffer: PDF_HEADER,
      declaredMime: 'application/pdf',
      extension: '.pdf',
      allowedMimes: DOC_ALLOWLIST,
      maxPixels: 1,
    });
    expect(result.ok).toBe(true);
  });
});

describe('PNG_HEADER export sanity', () => {
  it('is a valid PNG signature (guards the test fixture)', () => {
    expect(PNG_HEADER.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});
