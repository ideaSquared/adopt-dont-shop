import { Request, Response, NextFunction } from 'express';
import SecurityService from '../services/security.service';
import { logger, loggerHelpers } from '../utils/logger';

/**
 * Enforces the configured IP allow/block lists. Mounted in front of
 * the login route so a compromised credential set can't be used from
 * an arbitrary IP. Allow lists default to off (no rules ⇒ everything
 * passes); a block-only configuration is the simplest "kick out a
 * known bad actor" mode.
 *
 * IP source priority: `X-Forwarded-For` first hop (when running
 * behind a trusted proxy), else `req.ip`. We assume the standard
 * `app.set('trust proxy', ...)` is configured upstream — this
 * middleware only reads the resulting `req.ip`.
 */
export const enforceIpRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || '';
    if (!ip) {
      return next();
    }
    const decision = await SecurityService.evaluateIp(ip);
    if (decision.allowed) {
      return next();
    }
    loggerHelpers.logSecurity('Login blocked by IP rule', {
      ip,
      reason: decision.reason,
      path: req.path,
    });
    return res.status(403).json({
      error: 'Access denied from this IP address',
    });
  } catch (error) {
    // If the IP-rule check itself fails, fail open so we don't lock
    // every admin out on a transient DB blip — but log loudly.
    logger.error('IP rule evaluation failed; allowing request', error);
    return next();
  }
};
