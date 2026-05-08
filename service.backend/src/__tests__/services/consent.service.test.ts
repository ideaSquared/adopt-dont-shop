/**
 * Behaviour tests for consent.service and the thin registration wrapper
 * (registration.service). Both files implement ADS-496/497 consent capture.
 *
 * The service writes an AuditLog row and optionally flips EmailPreference
 * rows — both via real in-memory SQLite (see setup-tests.ts).
 */
import { describe, it, expect, vi } from 'vitest';

// AuditLogService does a User.findByPk snapshot — mock it so the test
// doesn't have to seed a user for every consent case.
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue({}),
  },
}));

// EmailPreference is queried for marketing consent; keep it stub-only so
// the test is purely behavioural and doesn't depend on DB schema quirks.
vi.mock('../../models/EmailPreference', () => ({
  default: {
    findOne: vi.fn().mockResolvedValue(null),
  },
  EmailFrequency: { IMMEDIATE: 'immediate', WEEKLY: 'weekly', NEVER: 'never' },
  NotificationType: { MARKETING: 'marketing', NEWSLETTER: 'newsletter' },
}));

import { recordConsent } from '../../services/consent.service';
import { captureRegistrationConsent } from '../../services/registration.service';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../services/legal-content.service';
import { AuditLogService } from '../../services/auditLog.service';

const ctx = { userId: 'user-abc', ip: '1.2.3.4', userAgent: 'test-agent/1.0' };

describe('consent.service — recordConsent', () => {
  it('rejects when ToS is not accepted', async () => {
    await expect(
      recordConsent({ tosAccepted: false, privacyAccepted: true, marketingConsent: false }, ctx)
    ).rejects.toThrow('Terms of Service and Privacy Policy must be accepted');
  });

  it('rejects when Privacy Policy is not accepted', async () => {
    await expect(
      recordConsent({ tosAccepted: true, privacyAccepted: false, marketingConsent: false }, ctx)
    ).rejects.toThrow('Terms of Service and Privacy Policy must be accepted');
  });

  it('rejects when both ToS and Privacy are declined', async () => {
    await expect(
      recordConsent({ tosAccepted: false, privacyAccepted: false, marketingConsent: false }, ctx)
    ).rejects.toThrow();
  });

  it('returns a ConsentRecord with the active legal version strings when both accepted', async () => {
    const result = await recordConsent(
      { tosAccepted: true, privacyAccepted: true, marketingConsent: false },
      ctx
    );

    expect(result.tosVersion).toBe(TERMS_VERSION);
    expect(result.privacyVersion).toBe(PRIVACY_VERSION);
    expect(result.marketingConsent).toBe(false);
    expect(typeof result.acceptedAt).toBe('string');
    // acceptedAt should be a parseable ISO timestamp
    expect(isNaN(Date.parse(result.acceptedAt))).toBe(false);
  });

  it('allows caller to override version strings for historical backfill', async () => {
    const result = await recordConsent(
      {
        tosAccepted: true,
        privacyAccepted: true,
        marketingConsent: false,
        tosVersion: '1.0-legacy',
        privacyVersion: '2.0-legacy',
      },
      ctx
    );

    expect(result.tosVersion).toBe('1.0-legacy');
    expect(result.privacyVersion).toBe('2.0-legacy');
  });

  it('records the consent via the audit log service', async () => {
    await recordConsent({ tosAccepted: true, privacyAccepted: true, marketingConsent: true }, ctx);

    expect(AuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ctx.userId,
        action: 'CONSENT_RECORDED',
        entity: 'User',
        entityId: ctx.userId,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
    );
  });

  it('embeds marketingConsent in the audit log details', async () => {
    await recordConsent({ tosAccepted: true, privacyAccepted: true, marketingConsent: true }, ctx);

    const callArgs = (AuditLogService.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.details.marketingConsent).toBe(true);
  });

  it('reflects the true/false marketing preference in the returned record', async () => {
    const withMarketing = await recordConsent(
      { tosAccepted: true, privacyAccepted: true, marketingConsent: true },
      ctx
    );
    expect(withMarketing.marketingConsent).toBe(true);

    const withoutMarketing = await recordConsent(
      { tosAccepted: true, privacyAccepted: true, marketingConsent: false },
      ctx
    );
    expect(withoutMarketing.marketingConsent).toBe(false);
  });

  it('handles a null IP and user-agent gracefully', async () => {
    const result = await recordConsent(
      { tosAccepted: true, privacyAccepted: true, marketingConsent: false },
      { userId: 'user-xyz', ip: null, userAgent: null }
    );

    expect(result.tosVersion).toBeDefined();
  });
});

describe('registration.service — captureRegistrationConsent', () => {
  it('delegates to recordConsent and returns a valid ConsentRecord', async () => {
    const result = await captureRegistrationConsent(
      { tosAccepted: true, privacyAccepted: true, marketingConsent: false },
      ctx
    );

    expect(result.tosVersion).toBe(TERMS_VERSION);
    expect(result.privacyVersion).toBe(PRIVACY_VERSION);
    expect(result.marketingConsent).toBe(false);
  });

  it('propagates the rejection from recordConsent when ToS not accepted', async () => {
    await expect(
      captureRegistrationConsent(
        { tosAccepted: false, privacyAccepted: true, marketingConsent: false },
        ctx
      )
    ).rejects.toThrow();
  });
});
