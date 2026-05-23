import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('./logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { EmailLinkType, resolveEmailLinkBase } from './email-url';
import { UserType } from '../models/User';

describe('resolveEmailLinkBase', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
    delete process.env.FRONTEND_URL;
    delete process.env.RESCUE_FRONTEND_URL;
    delete process.env.ADMIN_FRONTEND_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('typed emails — destination is pinned regardless of recipient role', () => {
    it('routes RESCUE_INVITATION to the rescue app even for an adopter recipient', () => {
      const base = resolveEmailLinkBase(EmailLinkType.RESCUE_INVITATION, UserType.ADOPTER);
      expect(base).toBe('http://localhost:3002');
    });

    it('routes RESCUE_VERIFICATION to the rescue app even for an admin recipient', () => {
      const base = resolveEmailLinkBase(EmailLinkType.RESCUE_VERIFICATION, UserType.ADMIN);
      expect(base).toBe('http://localhost:3002');
    });

    it('routes PASSWORD_RESET to the client app even for rescue staff', () => {
      const base = resolveEmailLinkBase(EmailLinkType.PASSWORD_RESET, UserType.RESCUE_STAFF);
      expect(base).toBe('http://localhost:3000');
    });

    it('routes EMAIL_VERIFICATION to the client app even for rescue staff', () => {
      const base = resolveEmailLinkBase(EmailLinkType.EMAIL_VERIFICATION, UserType.RESCUE_STAFF);
      expect(base).toBe('http://localhost:3000');
    });

    it('routes TWO_FACTOR_RECOVERY to the client app even for admins', () => {
      const base = resolveEmailLinkBase(EmailLinkType.TWO_FACTOR_RECOVERY, UserType.ADMIN);
      expect(base).toBe('http://localhost:3000');
    });

    it('routes APPLICATION_STATUS_CHANGE to the client app even for rescue staff', () => {
      const base = resolveEmailLinkBase(
        EmailLinkType.APPLICATION_STATUS_CHANGE,
        UserType.RESCUE_STAFF
      );
      expect(base).toBe('http://localhost:3000');
    });
  });

  describe('role-driven emails — destination follows recipient primary role', () => {
    it('routes a GENERIC email for an adopter to the client app', () => {
      const base = resolveEmailLinkBase(EmailLinkType.GENERIC, UserType.ADOPTER);
      expect(base).toBe('http://localhost:3000');
    });

    it('routes a GENERIC email for rescue staff to the rescue app', () => {
      const base = resolveEmailLinkBase(EmailLinkType.GENERIC, UserType.RESCUE_STAFF);
      expect(base).toBe('http://localhost:3002');
    });

    it('routes a GENERIC email for an admin to the admin app', () => {
      const base = resolveEmailLinkBase(EmailLinkType.GENERIC, UserType.ADMIN);
      expect(base).toBe('http://localhost:3001');
    });

    it('routes a moderation-outcome email for a moderator to the admin app', () => {
      const base = resolveEmailLinkBase(EmailLinkType.MODERATION_OUTCOME, UserType.MODERATOR);
      expect(base).toBe('http://localhost:3001');
    });

    it('routes a legal-reacceptance email for rescue staff to the rescue app', () => {
      const base = resolveEmailLinkBase(EmailLinkType.LEGAL_REACCEPTANCE, UserType.RESCUE_STAFF);
      expect(base).toBe('http://localhost:3002');
    });
  });

  describe('fallback when recipient primary role is unknown', () => {
    it('routes a GENERIC email with no role to the client app (safe default)', () => {
      const base = resolveEmailLinkBase(EmailLinkType.GENERIC);
      expect(base).toBe('http://localhost:3000');
    });

    it('routes a LEGAL_REACCEPTANCE email with no role to the client app', () => {
      const base = resolveEmailLinkBase(EmailLinkType.LEGAL_REACCEPTANCE);
      expect(base).toBe('http://localhost:3000');
    });
  });

  describe('honours configured environment URLs', () => {
    it('uses ADMIN_FRONTEND_URL when configured', () => {
      process.env.ADMIN_FRONTEND_URL = 'http://localhost:3001';
      const base = resolveEmailLinkBase(EmailLinkType.GENERIC, UserType.ADMIN);
      expect(base).toBe('http://localhost:3001');
    });

    it('uses RESCUE_FRONTEND_URL when configured', () => {
      process.env.RESCUE_FRONTEND_URL = 'http://localhost:3002';
      const base = resolveEmailLinkBase(EmailLinkType.RESCUE_INVITATION);
      expect(base).toBe('http://localhost:3002');
    });

    it('strips trailing slash from configured URL', () => {
      process.env.RESCUE_FRONTEND_URL = 'http://localhost:3002/';
      const base = resolveEmailLinkBase(EmailLinkType.RESCUE_INVITATION);
      expect(base).toBe('http://localhost:3002');
    });
  });
});
