// Upload content verification (ADS-848 steps 1 + 2).
//
// Both upload routes (uploads.ts, application-documents.ts) gate on a
// client-supplied MIME allowlist + an extension allowlist. Those are trivially
// spoofable — a client controls both the Content-Type header and the filename.
// This module adds two byte-level checks that a client cannot lie about:
//
//   1. Magic-byte sniffing (file-type): the bytes are sniffed and rejected
//      when the detected type contradicts the declared MIME / isn't in the
//      allowlist. Catches the classic `.exe` renamed to `.png` smuggle.
//   2. Image-bomb guard (sharp metadata): for images, the decoded dimensions
//      are read from the header and rejected when the pixel count exceeds a
//      cap, so a decompression bomb can't OOM-kill a later resize step.
//
// AV scanning is a separate, larger step — see the TODO marker in each route.

import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

// Default decoded-pixel cap for the image-bomb guard. 50 megapixels comfortably
// clears any legitimate photo (a 24 MP DSLR is ~6000x4000) while rejecting the
// absurd dimensions a decompression bomb declares.
export const DEFAULT_MAX_IMAGE_PIXELS = 50_000_000;

export type VerifyUploadContentInput = {
  buffer: Buffer;
  // The MIME the client declared (Content-Type of the multipart part).
  declaredMime: string;
  // The lower-cased file extension including the dot (e.g. ".png").
  extension: string;
  // The route's MIME allowlist — the sniffed type must be a member.
  allowedMimes: Set<string>;
  // Decoded-pixel cap for images. Defaults to DEFAULT_MAX_IMAGE_PIXELS.
  maxPixels?: number;
};

export type VerifyUploadContentResult = { ok: true } | { ok: false; error: string };

// Container formats whose sniffed type legitimately differs from the declared
// office MIME. A .docx is a ZIP; a legacy .doc is an OLE/CFB compound file.
// Without this, a genuine Word upload would be false-rejected by the
// declared-vs-sniffed check.
const SNIFF_EQUIVALENTS: Record<string, ReadonlySet<string>> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': new Set([
    'application/zip',
  ]),
  'application/msword': new Set(['application/x-cfb']),
};

const IMAGE_MIME_PREFIX = 'image/';

// Office/PDF container formats whose magic bytes file-type is expected to
// recognise (PDF's `%PDF` header, legacy DOC's OLE/CFB header, DOCX's ZIP
// header). A declared MIME in this set that sniffs as `undefined` is not a
// format file-type merely can't classify — it's bytes that aren't actually
// one of these containers, smuggled behind a document Content-Type.
const DOCUMENT_CONTAINER_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const mimeMatchesDeclared = (sniffedMime: string, declaredMime: string): boolean => {
  if (sniffedMime === declaredMime) {
    return true;
  }
  return SNIFF_EQUIVALENTS[declaredMime]?.has(sniffedMime) ?? false;
};

export const verifyUploadContent = async (
  input: VerifyUploadContentInput
): Promise<VerifyUploadContentResult> => {
  const { buffer, declaredMime, allowedMimes } = input;

  const sniffed = await fileTypeFromBuffer(buffer);

  if (sniffed !== undefined) {
    if (!mimeMatchesDeclared(sniffed.mime, declaredMime)) {
      return { ok: false, error: 'file content does not match the declared type' };
    }
    if (!allowedMimes.has(sniffed.mime) && !allowedMimes.has(declaredMime)) {
      return { ok: false, error: `File type ${sniffed.mime} is not allowed` };
    }
  } else if (DOCUMENT_CONTAINER_MIMES.has(declaredMime)) {
    // A genuine PDF/DOC/DOCX always sniffs to a defined type (see above), so
    // an undefined sniff here means the bytes aren't actually one of those
    // containers — reject rather than pass through.
    return { ok: false, error: 'file content does not match the declared type' };
  }
  // Any other declared MIME that file-type can't classify (not a document
  // container) still passes through to the checks below — the MIME +
  // extension allowlists upstream already gate those.

  // Image-bomb guard only applies to images. Documents (PDF / Word) skip it.
  if (declaredMime.startsWith(IMAGE_MIME_PREFIX)) {
    return verifyImageDimensions(buffer, input.maxPixels ?? DEFAULT_MAX_IMAGE_PIXELS);
  }

  return { ok: true };
};

const verifyImageDimensions = async (
  buffer: Buffer,
  maxPixels: number
): Promise<VerifyUploadContentResult> => {
  let width: number | undefined;
  let height: number | undefined;
  try {
    const metadata = await sharp(buffer).metadata();
    width = metadata.width;
    height = metadata.height;
  } catch {
    // Couldn't decode the header as an image. The magic-byte check already
    // confirmed it sniffed as a known image type, so a metadata failure means
    // a malformed / hostile image — reject it.
    return { ok: false, error: 'image dimensions could not be read' };
  }

  if (width === undefined || height === undefined) {
    return { ok: false, error: 'image dimensions could not be read' };
  }

  if (width * height > maxPixels) {
    return { ok: false, error: 'image dimensions exceed the allowed maximum' };
  }

  return { ok: true };
};
