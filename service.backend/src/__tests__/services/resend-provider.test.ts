import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ResendProvider } from '../../services/email-providers/resend-provider';
import EmailQueue from '../../models/EmailQueue';

const mockEmailsSend = vi.fn();

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockEmailsSend };

    constructor(_apiKey: string) {}
  },
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));

const buildEmail = (overrides: Partial<EmailQueue> = {}): EmailQueue =>
  ({
    fromEmail: 'noreply@adoptdontshop.com',
    fromName: "Adopt Don't Shop",
    toEmail: 'adopter@example.com',
    toName: 'Jane Adopter',
    subject: 'Your application update',
    htmlContent: '<p>Good news!</p>',
    textContent: 'Good news!',
    ...overrides,
  }) as EmailQueue;

describe('ResendProvider', () => {
  describe('validateConfiguration', () => {
    it('returns true when both apiKey and fromEmail are present', () => {
      const provider = new ResendProvider({
        apiKey: 're_abc123',
        fromEmail: 'noreply@adoptdontshop.com',
        fromName: "Adopt Don't Shop",
      });
      expect(provider.validateConfiguration()).toBe(true);
    });

    it('returns false when apiKey is missing', () => {
      const provider = new ResendProvider({
        apiKey: '',
        fromEmail: 'noreply@adoptdontshop.com',
        fromName: "Adopt Don't Shop",
      });
      expect(provider.validateConfiguration()).toBe(false);
    });

    it('returns false when fromEmail is missing', () => {
      const provider = new ResendProvider({
        apiKey: 're_abc123',
        fromEmail: '',
        fromName: "Adopt Don't Shop",
      });
      expect(provider.validateConfiguration()).toBe(false);
    });
  });

  describe('getName', () => {
    it('returns "Resend"', () => {
      const provider = new ResendProvider({
        apiKey: 're_abc123',
        fromEmail: 'noreply@adoptdontshop.com',
        fromName: "Adopt Don't Shop",
      });
      expect(provider.getName()).toBe('Resend');
    });
  });

  describe('send', () => {
    let provider: ResendProvider;

    beforeEach(() => {
      mockEmailsSend.mockReset();

      provider = new ResendProvider({
        apiKey: 're_abc123',
        fromEmail: 'noreply@adoptdontshop.com',
        fromName: "Adopt Don't Shop",
        replyTo: 'support@adoptdontshop.com',
      });
    });

    it('returns success with messageId when Resend accepts the email', async () => {
      mockEmailsSend.mockResolvedValue({ data: { id: 'resend_msg_001' }, error: null });

      const result = await provider.send(buildEmail());

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('resend_msg_001');
      expect(result.error).toBeUndefined();
    });

    it('passes sanitized from/to/subject/html/text to the Resend client', async () => {
      mockEmailsSend.mockResolvedValue({ data: { id: 'resend_msg_002' }, error: null });

      await provider.send(
        buildEmail({
          fromEmail: 'noreply@adoptdontshop.com',
          fromName: "Adopt Don't Shop",
          toEmail: 'adopter@example.com',
          toName: 'Jane Adopter',
          subject: 'Application approved',
          htmlContent: '<p>Approved!</p>',
          textContent: 'Approved!',
        })
      );

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Adopt Don't Shop <noreply@adoptdontshop.com>",
          to: 'Jane Adopter <adopter@example.com>',
          subject: 'Application approved',
          html: '<p>Approved!</p>',
          text: 'Approved!',
        })
      );
    });

    it('includes replyTo when configured', async () => {
      mockEmailsSend.mockResolvedValue({ data: { id: 'resend_msg_003' }, error: null });

      await provider.send(buildEmail());

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: 'support@adoptdontshop.com' })
      );
    });

    it('omits replyTo when not configured', async () => {
      const providerWithoutReplyTo = new ResendProvider({
        apiKey: 're_abc123',
        fromEmail: 'noreply@adoptdontshop.com',
        fromName: "Adopt Don't Shop",
      });
      mockEmailsSend.mockResolvedValue({ data: { id: 'resend_msg_004' }, error: null });

      await providerWithoutReplyTo.send(buildEmail());

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call).not.toHaveProperty('replyTo');
    });

    it('omits text when textContent is not set', async () => {
      mockEmailsSend.mockResolvedValue({ data: { id: 'resend_msg_005' }, error: null });

      await provider.send(buildEmail({ textContent: undefined }));

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call).not.toHaveProperty('text');
    });

    it('returns failure with error message when Resend rejects the send', async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key', statusCode: 401, name: 'validation_error' },
      });

      const result = await provider.send(buildEmail());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
      expect(result.messageId).toBeUndefined();
    });

    it('strips CRLF injection attempts from header fields before sending', async () => {
      mockEmailsSend.mockResolvedValue({ data: { id: 'resend_msg_006' }, error: null });

      await provider.send(
        buildEmail({
          subject: 'Subject\r\nX-Injected: evil',
          fromName: 'Legit Name\nBcc: evil@hacker.com',
        })
      );

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.subject).not.toContain('\r');
      expect(call.subject).not.toContain('\n');
      expect(call.from).not.toContain('\n');
    });
  });
});
