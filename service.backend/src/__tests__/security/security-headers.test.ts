import { vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import helmet from 'helmet';
import cors from 'cors';

// Mock logger to prevent initialization issues
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Security Headers', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a minimal Express app with the same security configuration
    app = express();

    // Apply CORS
    app.use(
      cors({
        origin: true,
        credentials: true,
      })
    );

    // Apply the same Helmet configuration as in index.ts
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        frameguard: {
          action: 'deny',
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: {
          policy: 'strict-origin-when-cross-origin',
        },
        dnsPrefetchControl: {
          allow: false,
        },
        ieNoOpen: true,
        permittedCrossDomainPolicies: {
          permittedPolicies: 'none',
        },
      })
    );

    // Add test routes
    app.get('/test', (_req, res) => {
      res.json({ status: 'ok' });
    });

    app.get('/test/health', (_req, res) => {
      res.json({ healthy: true });
    });
  });

  describe('Helmet Security Headers', () => {
    it('should set X-Content-Type-Options header to nosniff', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header to DENY', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-XSS-Protection header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    it('should set Strict-Transport-Security header with correct directives', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
      expect(response.headers['strict-transport-security']).toContain('preload');
    });

    it('should set Content-Security-Policy header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should set Referrer-Policy header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['referrer-policy']).toBeDefined();
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should set X-DNS-Prefetch-Control header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('should set X-Download-Options header for IE', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-download-options']).toBe('noopen');
    });

    it('should set X-Permitted-Cross-Domain-Policies header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    });
  });

  describe('Content Security Policy Directives', () => {
    it('should have CSP with default-src self', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain("default-src 'self'");
    });

    it('should have CSP with object-src none (prevent Flash/Java)', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain("object-src 'none'");
    });

    it('should have CSP with frame-ancestors none (prevent clickjacking)', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should have CSP with base-uri self (prevent base tag injection)', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain("base-uri 'self'");
    });

    it('should have CSP with form-action self (prevent form hijacking)', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain("form-action 'self'");
    });

    it('should have CSP with upgrade-insecure-requests', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should allow WebSocket connections in connectSrc', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain('ws:');
      expect(csp).toContain('wss:');
    });

    it('should allow data: and https: for images', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain('data:');
      expect(csp).toContain('https:');
    });
  });

  describe('Security Header Consistency', () => {
    it('should set security headers on all endpoints', async () => {
      const endpoints = ['/test', '/test/health'];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['content-security-policy']).toBeDefined();
      }
    });

    it('should not expose sensitive server information', async () => {
      const response = await request(app).get('/test');

      // Helmet should remove or mask these headers
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('CORS Headers', () => {
    it('should set appropriate CORS headers', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      // CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should allow credentials when configured', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Protection Against Common Vulnerabilities', () => {
    it('should prevent clickjacking with X-Frame-Options', async () => {
      const response = await request(app).get('/test');

      // DENY prevents the page from being displayed in a frame
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should prevent MIME sniffing attacks', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should enforce HTTPS with HSTS', async () => {
      const response = await request(app).get('/test');
      const hsts = response.headers['strict-transport-security'];

      expect(hsts).toContain('max-age=31536000'); // 1 year
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should prevent information disclosure via referrer', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });
});
