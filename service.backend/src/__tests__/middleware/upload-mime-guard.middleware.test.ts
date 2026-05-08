import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock file-type so we can drive the sniffed MIME without touching disk.
// (Global setup-tests.ts mocks `fs`, which would interfere with reading bytes.)
const fromFileMock = vi.fn();
vi.mock('file-type', () => ({
  fromFile: (...args: unknown[]) => fromFileMock(...args),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { enforceUploadMime } from '../../middleware/upload-mime-guard';

const buildReqRes = (file: Express.Multer.File | undefined) => {
  const req = { file, files: undefined } as unknown as Request;
  let status = 0;
  let payload: unknown = null;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(body: unknown) {
      payload = body;
      return this;
    },
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return {
    req,
    res,
    next,
    status: () => status,
    payload: () => payload,
  };
};

describe('enforceUploadMime (ADS-437)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromFileMock.mockReset();
  });

  it('passes when sniffed MIME matches declared MIME', async () => {
    fromFileMock.mockResolvedValue({ mime: 'image/png', ext: 'png' });
    const file = {
      path: '/tmp/good.png',
      mimetype: 'image/png',
      originalname: 'good.png',
    } as Express.Multer.File;

    const ctx = buildReqRes(file);
    await enforceUploadMime(ctx.req, ctx.res, ctx.next);

    expect(ctx.next).toHaveBeenCalled();
    expect(ctx.status()).toBe(0);
  });

  it('rejects when sniffed MIME differs from declared MIME', async () => {
    // Client claims image/jpeg but the actual content is HTML.
    fromFileMock.mockResolvedValue({ mime: 'text/html', ext: 'html' });
    const file = {
      path: '/tmp/evil.jpg',
      mimetype: 'image/jpeg',
      originalname: 'evil.jpg',
    } as Express.Multer.File;

    const ctx = buildReqRes(file);
    await enforceUploadMime(ctx.req, ctx.res, ctx.next);

    expect(ctx.next).not.toHaveBeenCalled();
    expect(ctx.status()).toBe(400);
    const body = ctx.payload() as { error: string };
    expect(body.error).toMatch(/does not match declared type/);
  });

  it('rejects when file-type cannot determine the type', async () => {
    fromFileMock.mockResolvedValue(undefined);
    const file = {
      path: '/tmp/unknown.bin',
      mimetype: 'image/png',
      originalname: 'unknown.bin',
    } as Express.Multer.File;

    const ctx = buildReqRes(file);
    await enforceUploadMime(ctx.req, ctx.res, ctx.next);

    expect(ctx.next).not.toHaveBeenCalled();
    expect(ctx.status()).toBe(400);
  });

  it('passes through when no file is attached', async () => {
    const ctx = buildReqRes(undefined);
    await enforceUploadMime(ctx.req, ctx.res, ctx.next);

    expect(ctx.next).toHaveBeenCalled();
    expect(fromFileMock).not.toHaveBeenCalled();
  });

  it('allows text/csv to bypass the magic-byte requirement', async () => {
    // Text-based formats have no magic bytes; we don't even call file-type.
    const file = {
      path: '/tmp/data.csv',
      mimetype: 'text/csv',
      originalname: 'data.csv',
    } as Express.Multer.File;

    const ctx = buildReqRes(file);
    await enforceUploadMime(ctx.req, ctx.res, ctx.next);

    expect(ctx.next).toHaveBeenCalled();
    expect(fromFileMock).not.toHaveBeenCalled();
  });

  it('checks every file when multiple are attached and rejects if any fail', async () => {
    fromFileMock
      .mockResolvedValueOnce({ mime: 'image/png', ext: 'png' })
      .mockResolvedValueOnce({ mime: 'text/html', ext: 'html' });

    const files = [
      {
        path: '/tmp/a.png',
        mimetype: 'image/png',
        originalname: 'a.png',
      },
      {
        path: '/tmp/b.png',
        mimetype: 'image/png', // declares png, sniff says html → reject
        originalname: 'b.png',
      },
    ] as Express.Multer.File[];

    const req = { file: undefined, files } as unknown as Request;
    let status = 0;
    const res = {
      status(c: number) {
        status = c;
        return this;
      },
      json() {
        return this;
      },
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    await enforceUploadMime(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toBe(400);
  });
});
