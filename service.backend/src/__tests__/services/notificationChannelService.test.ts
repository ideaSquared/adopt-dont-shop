/**
 * ADS-607: behaviour tests for the email-channel path of
 * NotificationChannelService. The HTML body interpolates the
 * caller-supplied `notification.message`, so anything that flows in from
 * chat previews, application notes, or broadcast messages must be
 * HTML-escaped before it lands in a recipient's inbox.
 *
 * ADS-604: behaviour tests for shouldSendToChannel — marketing
 * notifications must be opt-in only; a prior bug let opted-out marketing
 * notifications through via a catch-all `return true`.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/User', () => ({
  default: { findByPk: vi.fn() },
}));

vi.mock('../../models/DeviceToken', () => ({
  default: { count: vi.fn(), findAll: vi.fn() },
}));

vi.mock('../../models/UserNotificationPrefs', () => ({
  default: { findOne: vi.fn() },
}));

vi.mock('../../services/email.service', () => ({
  default: { sendEmail: vi.fn().mockResolvedValue('email-id-xyz') },
}));

import User from '../../models/User';
import emailService from '../../services/email.service';
import { NotificationChannelService } from '../../services/notificationChannelService';
import { NotificationPreferences } from '../../services/notification.service';

const mockUserFindByPk = vi.mocked(User.findByPk);
const mockSendEmail = vi.mocked(emailService.sendEmail);

const buildNotification = (message: string) => ({
  userId: 'user-1',
  title: 'A notification',
  message,
  type: 'message.chat',
});

const recipient = {
  email: 'recipient@example.com',
  firstName: 'Sam',
  lastName: 'Adopter',
};

describe('NotificationChannelService email delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindByPk.mockResolvedValue(recipient as never);
  });

  it('escapes <script> tags injected via notification.message in the HTML body', async () => {
    const malicious = '<script>alert(1)</script>';
    const results = await NotificationChannelService.deliverToChannels(
      buildNotification(malicious),
      ['email']
    );

    expect(results).toEqual([{ channel: 'email', success: true, deliveryId: 'email-id-xyz' }]);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const payload = mockSendEmail.mock.calls[0][0];
    expect(payload.htmlContent).toBe('<p>&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</p>');
    expect(payload.htmlContent).not.toContain('<script>');
  });

  it('escapes inline event handlers such as <img onerror=...> so they cannot fire in email clients', async () => {
    const malicious = '<img src=x onerror="alert(1)">';
    await NotificationChannelService.deliverToChannels(buildNotification(malicious), ['email']);

    const payload = mockSendEmail.mock.calls[0][0];
    // The angle brackets are escaped so the email client cannot parse this
    // as an <img> tag, neutering the onerror handler regardless of the
    // attribute text surviving as literal characters in the entity body.
    expect(payload.htmlContent).not.toContain('<img');
    expect(payload.htmlContent).toContain('&lt;img');
    expect(payload.htmlContent).toContain('&quot;');
  });

  it('escapes attacker-crafted anchor tags so phishing links cannot be smuggled in', async () => {
    const malicious = '<a href="https://phishing.example">Click here</a>';
    await NotificationChannelService.deliverToChannels(buildNotification(malicious), ['email']);

    const payload = mockSendEmail.mock.calls[0][0];
    expect(payload.htmlContent).not.toMatch(/<a\s/);
    expect(payload.htmlContent).toContain(
      '&lt;a href=&quot;https:&#x2F;&#x2F;phishing.example&quot;&gt;'
    );
  });

  it('escapes ampersands so existing entities are not double-decoded by the email client', async () => {
    await NotificationChannelService.deliverToChannels(buildNotification('Tom & Jerry <3'), [
      'email',
    ]);

    const payload = mockSendEmail.mock.calls[0][0];
    expect(payload.htmlContent).toBe('<p>Tom &amp; Jerry &lt;3</p>');
  });

  it('passes the raw, unescaped message through in the plain-text body', async () => {
    const malicious = '<script>alert(1)</script>';
    await NotificationChannelService.deliverToChannels(buildNotification(malicious), ['email']);

    const payload = mockSendEmail.mock.calls[0][0];
    expect(payload.textContent).toBe(malicious);
  });

  it('leaves benign messages with normal punctuation rendering correctly', async () => {
    const normal = 'Your application for Buddy has been approved!';
    await NotificationChannelService.deliverToChannels(buildNotification(normal), ['email']);

    const payload = mockSendEmail.mock.calls[0][0];
    expect(payload.htmlContent).toBe('<p>Your application for Buddy has been approved!</p>');
    expect(payload.textContent).toBe(normal);
  });
});

// ADS-604: Marketing notifications must be opt-in only. Prior bug let
// opted-out marketing notifications through via a catch-all `return true`.
describe('NotificationChannelService.shouldSendToChannel', () => {
  const basePrefs: NotificationPreferences = {
    email: true,
    push: true,
    sms: true,
    applications: true,
    messages: true,
    system: true,
    marketing: false,
    reminders: true,
  };

  const channels: Array<'email' | 'push' | 'sms'> = ['email', 'push', 'sms'];

  describe('marketing notifications (opt-in only)', () => {
    for (const channel of channels) {
      describe(`channel: ${channel}`, () => {
        it('sends when user has opted in (marketing: true)', () => {
          const prefs: NotificationPreferences = { ...basePrefs, marketing: true };
          expect(
            NotificationChannelService.shouldSendToChannel(channel, 'marketing.promo', prefs)
          ).toBe(true);
        });

        it('drops when user has opted out (marketing: false)', () => {
          const prefs: NotificationPreferences = { ...basePrefs, marketing: false };
          expect(
            NotificationChannelService.shouldSendToChannel(channel, 'marketing.promo', prefs)
          ).toBe(false);
        });

        it('drops when preference is unset (marketing: undefined)', () => {
          // marketing is required in the type but the runtime preference row
          // can be missing; emulate that by stripping the field. Cast through
          // unknown so we keep strict mode happy without `any`.
          const { marketing: _ignored, ...partial } = basePrefs;
          const prefs = partial as unknown as NotificationPreferences;
          expect(
            NotificationChannelService.shouldSendToChannel(channel, 'marketing.promo', prefs)
          ).toBe(false);
        });
      });
    }
  });

  describe('non-marketing notifications (existing flow preserved)', () => {
    for (const channel of channels) {
      it(`sends application.update on ${channel} even when marketing is opted out`, () => {
        const prefs: NotificationPreferences = { ...basePrefs, marketing: false };
        expect(
          NotificationChannelService.shouldSendToChannel(channel, 'application.update', prefs)
        ).toBe(true);
      });
    }

    it('sends system notifications regardless of marketing preference', () => {
      const prefs: NotificationPreferences = { ...basePrefs, marketing: false };
      expect(
        NotificationChannelService.shouldSendToChannel('email', 'system.maintenance', prefs)
      ).toBe(true);
    });

    it('sends reminders when not explicitly disabled', () => {
      const prefs: NotificationPreferences = { ...basePrefs, marketing: false, reminders: true };
      expect(
        NotificationChannelService.shouldSendToChannel('email', 'reminder.followup', prefs)
      ).toBe(true);
    });

    it('sends unrelated types via the default-send fallback', () => {
      const prefs: NotificationPreferences = { ...basePrefs, marketing: false };
      expect(NotificationChannelService.shouldSendToChannel('email', 'generic.event', prefs)).toBe(
        true
      );
    });
  });
});
