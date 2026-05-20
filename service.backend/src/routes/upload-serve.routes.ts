import crypto from 'crypto';
import * as fs from 'fs';
import path from 'path';
import { Router, type Response } from 'express';
import { config } from '../config';
import { authenticateToken } from '../middleware/auth';
import { apiLimiter } from '../middleware/rate-limiter';
import { env } from '../config/env';
import { decideUploadAccess } from '../services/upload-acl.service';
import { getStorageProvider } from '../services/storage';
import type { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

/**
 * ADS-422 / ADS-429: auth-gated upload serving.
 *
 * Replaces the unauthenticated `express.static('/uploads', ...)` mount.
 * All file requests now require a valid session/JWT, and the file is
 * streamed from disk only after authentication succeeds. Per-resource
 * authorisation (e.g. "only the application owner + assigned rescue
 * staff can read this home-visit doc") is a follow-up — this gate is
 * the must-have first step that closes the public-readable hole.
 *
 * A short-lived signed-URL helper is also exported so that callers
 * which need to embed an image in an email or pass a URL to a
 * non-credentialed renderer can mint a single-use, time-bounded URL.
 *
 * Production note: serving from Node still consumes a worker per
 * request. The follow-up issue (ADS-422) covers moving this to nginx
 * `internal;` location with `X-Accel-Redirect`, or to S3 + CloudFront
 * with signed URLs. The shape of the API here (an Express router that
 * resolves a path safely and streams it) is deliberately a drop-in
 * replacement for either follow-up.
 */

const router = Router();

const SIGNED_TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes — long enough for an inline <img> render, short enough that a leaked URL has near-zero replay window.

const signingKey = (): string => env.UPLOAD_SIGNING_SECRET;

const safeResolve = (relativePath: string): string | null => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const uploadDir = path.resolve(config.storage.local.directory);

  // Reject paths that would escape the project root entirely.
  if (!uploadDir.startsWith(projectRoot + path.sep) && uploadDir !== projectRoot) {
    return null;
  }

  // Strip leading separators and any embedded `..` segments. `path.resolve`
  // canonicalises the result; we then check it stays inside `uploadDir`.
  const cleaned = relativePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  if (cleaned.split('/').some(segment => segment === '..' || segment === '.')) {
    return null;
  }

  const resolved = path.resolve(uploadDir, cleaned);

  // Use path.relative for the containment check — CodeQL recognises this
  // as a path-traversal sanitiser. A relative path that starts with `..` or
  // is absolute escapes the upload directory; reject in either case.
  const relative = path.relative(uploadDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
};

const computeSignature = (filePath: string, expiresAt: number): string =>
  crypto.createHmac('sha256', signingKey()).update(`${filePath}:${expiresAt}`).digest('hex');

export type SignedUploadUrl = {
  url: string;
  expiresAt: string;
};

/**
 * Mint a short-lived signed URL for a stored upload path. The URL
 * resolves through `GET /uploads-signed/:expiresAt/:signature/...path`
 * which validates the HMAC and TTL without requiring authentication —
 * useful for embedding in transactional emails or letting a worker
 * fetch the asset.
 */
export const buildSignedUploadUrl = (
  relativePath: string,
  baseUrl: string = process.env.API_URL ?? ''
): SignedUploadUrl => {
  const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_TOKEN_TTL_SECONDS;
  const cleaned = relativePath.replace(/^[/\\]+/, '');
  const signature = computeSignature(cleaned, expiresAt);
  const url = `${baseUrl.replace(/\/$/, '')}/uploads-signed/${expiresAt}/${signature}/${cleaned}`;
  return { url, expiresAt: new Date(expiresAt * 1000).toISOString() };
};

// Short TTL for presigned redirects. Long enough for an inline <img> render or
// PDF preview; short enough that a leaked Location header has near-zero replay
// value (and the browser cache is bounded by the redirect's max-age below).
const PRESIGNED_REDIRECT_TTL_SECONDS = 5 * 60;

/**
 * For storage backends that mint signed URLs (S3 / CloudFront), respond with a
 * 302 to a short-lived signed URL so the client streams the object directly
 * from the CDN rather than through Node. The auth + ACL gate already ran by
 * the time we get here, so the redirect cannot escalate privileges.
 *
 * Returns true when a redirect was sent; the caller should fall back to
 * filesystem streaming when this returns false.
 */
const tryRedirectToProvider = async (filePath: string, res: Response): Promise<boolean> => {
  const provider = getStorageProvider();
  if (!provider.supportsSignedUrls()) {
    return false;
  }

  const cleaned = filePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  const lastSlash = cleaned.lastIndexOf('/');
  if (lastSlash === -1) {
    return false;
  }
  const category = cleaned.slice(0, lastSlash);
  const filename = cleaned.slice(lastSlash + 1);
  if (!category || !filename) {
    return false;
  }

  try {
    const signedUrl = await provider.getSignedUrl(
      filename,
      category,
      PRESIGNED_REDIRECT_TTL_SECONDS
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.redirect(302, signedUrl);
    return true;
  } catch (error) {
    logger.error('Failed to mint signed URL for upload serve', {
      provider: provider.getName(),
      category,
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(502).json({ error: 'Storage backend unavailable' });
    return true;
  }
};

const streamFile = (resolved: string, res: Response): void => {
  fs.stat(resolved, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const mimeByExt: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    const mime = mimeByExt[ext] ?? 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(stats.size));
    if (ext === '.pdf') {
      res.setHeader('Content-Disposition', 'inline');
    }
    // ADS-598: any historical SVG already on disk must be downloaded,
    // not rendered. New SVG uploads are rejected upstream by the
    // file-upload allowlist, but the Express fallback still serves
    // legacy files for environments where this code runs without nginx
    // in front. Forcing `attachment` prevents stored XSS via SVG
    // payloads (event hooks, foreign content) executing same-origin.
    if (ext === '.svg' || ext === '.svgz') {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    // Authenticated content must NEVER be cached by shared caches —
    // they can't replay the auth check on a follow-up requester.
    res.setHeader('Cache-Control', 'private, max-age=300');

    fs.createReadStream(resolved).pipe(res);
  });
};

router.get(
  '/uploads-signed/:expiresAt/:signature/*filepath',
  apiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const expiresAt = Number.parseInt(req.params.expiresAt, 10);
    const { signature } = req.params;
    const filePathSegments = (req.params as Record<string, string | string[]>).filepath;
    const filePath = Array.isArray(filePathSegments)
      ? filePathSegments.join('/')
      : (filePathSegments ?? '');

    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
      res.status(410).json({ error: 'Signed URL expired' });
      return;
    }

    const expected = computeSignature(filePath, expiresAt);
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(signature, 'hex');
    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      res.status(403).json({ error: 'Invalid signature' });
      return;
    }

    // Remote backend: signature check already authorised the request, so 302
    // to a short-lived presigned URL. No filesystem read needed.
    if (await tryRedirectToProvider(filePath, res)) {
      return;
    }

    const resolved = safeResolve(filePath);
    if (!resolved) {
      res.status(400).json({ error: 'Invalid file path' });
      return;
    }
    streamFile(resolved, res);
  }
);

/**
 * ADS-422: nginx auth_request subrequest endpoint.
 *
 * nginx calls this internally before streaming a file from the shared
 * uploads volume. The request carries the original client cookies/JWT so
 * authentication works identically to the regular API. nginx only inspects
 * the HTTP status code; a 200 means "proceed", anything else means "deny".
 * The body MUST be empty so nginx does not buffer it.
 *
 * nginx sets X-Original-URI to the full request path; we also accept a
 * `path` query parameter for explicitness.
 */
router.get(
  '/api/v1/uploads/authorize',
  apiLimiter,
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => {
    const filePath = (req.query['path'] as string | undefined) ?? '';

    if (!filePath) {
      res.status(400).end();
      return;
    }

    const remoteBackend = getStorageProvider().supportsSignedUrls();
    const resolved = remoteBackend ? null : safeResolve(filePath);
    if (!remoteBackend && !resolved) {
      logger.warn('Upload authorize: rejected unsafe path', {
        userId: req.user?.userId,
        requested: filePath,
        originalUri: req.headers['x-original-uri'],
      });
      res.status(403).end();
      return;
    }

    const runAcl = (): void => {
      const user = req.user;
      if (!user) {
        res.status(401).end();
        return;
      }
      decideUploadAccess({ filePath, user })
        .then(verdict => {
          if (verdict !== 200) {
            logger.warn('Upload authorize: ACL denied', {
              userId: user.userId,
              requested: filePath,
              verdict,
            });
          }
          res.status(verdict).end();
        })
        .catch(err => {
          logger.error('Upload authorize: ACL check failed', {
            userId: user.userId,
            requested: filePath,
            error: err instanceof Error ? err.message : String(err),
          });
          res.status(403).end();
        });
    };

    if (remoteBackend) {
      // For remote backends the object lives in S3 — skip the on-disk
      // existence check and let the ACL verdict drive the response. A 404
      // would come from the eventual GetObject if the key is missing.
      runAcl();
      return;
    }

    if (!resolved) {
      res.status(403).end();
      return;
    }
    fs.stat(resolved, (statErr, stats) => {
      if (statErr || !stats.isFile()) {
        res.status(404).end();
        return;
      }
      // Per-resource ACL: confirm the authenticated user is allowed to
      // see this specific file (owner / rescue staff / chat participant
      // / admin). Public path-shapes (pets/, profiles/) short-circuit
      // to 200 inside the helper.
      runAcl();
    });
  }
);

router.get(
  '/uploads/*filepath',
  apiLimiter,
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => {
    const remoteBackend = getStorageProvider().supportsSignedUrls();
    if (!remoteBackend && !config.storage.local.serveLocalUploads) {
      res.status(404).end();
      return;
    }

    const filePathSegments = (req.params as Record<string, string | string[]>).filepath;
    const filePath = Array.isArray(filePathSegments)
      ? filePathSegments.join('/')
      : (filePathSegments ?? '');

    // For the local backend we resolve the on-disk path up-front; for remote
    // backends we skip the filesystem check entirely since the object lives in
    // S3, not on disk. Either way path-shape validation still runs via the
    // upload-acl helper below.
    const resolved = remoteBackend ? null : safeResolve(filePath);
    if (!remoteBackend && !resolved) {
      logger.warn('Upload serve: rejected unsafe path', {
        userId: req.user?.userId,
        requested: filePath,
      });
      res.status(400).json({ error: 'Invalid file path' });
      return;
    }

    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorised' });
      return;
    }

    decideUploadAccess({ filePath, user })
      .then(async verdict => {
        if (verdict !== 200) {
          logger.warn('Upload serve: ACL denied', {
            userId: user.userId,
            requested: filePath,
            verdict,
          });
          res.status(verdict).end();
          return;
        }
        if (remoteBackend) {
          await tryRedirectToProvider(filePath, res);
          return;
        }
        if (resolved) {
          streamFile(resolved, res);
        }
      })
      .catch(err => {
        logger.error('Upload serve: ACL check failed', {
          userId: user.userId,
          requested: filePath,
          error: err instanceof Error ? err.message : String(err),
        });
        res.status(403).end();
      });
  }
);

export default router;
