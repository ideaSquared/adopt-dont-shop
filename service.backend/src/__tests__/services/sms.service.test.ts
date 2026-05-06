import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseSmsProvider, type SmsProvider } from '../../services/sms-providers/base-provider';
import { ConsoleSmsProvider } from '../../services/sms-providers/console-provider';
import { SmsService } from '../../services/sms.service';

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  loggerHelpers: {
    logExternalService: vi.fn(),
  },
}));

describe('BaseSmsProvider.normalisePhone', () => {
  it.each([
    ['+447911123456', undefined, '+447911123456'],
    ['+1 (415) 555-1234', undefined, '+14155551234'],
    ['00447911123456', undefined, '+447911123456'],
    ['07911 123456', '44', '+4407911123456'],
    ['(415) 555-1234', '1', '+14155551234'],
    ['  +44 7911 123 456 ', undefined, '+447911123456'],
  ])('normalises %s (default cc=%s) to %s', (input, defaultCc, expected) => {
    expect(BaseSmsProvider.normalisePhone(input, defaultCc)).toBe(expected);
  });

  it.each([
    [''],
    ['   '],
    ['abcdef'],
    ['07911 123456'], // no leading + and no defaultCountryCode
    ['+1234'], // too short to be E.164
    ['+1234567890123456'], // too long
  ])('returns null for unparseable input %s', input => {
    expect(BaseSmsProvider.normalisePhone(input)).toBeNull();
  });
});

describe('ConsoleSmsProvider', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('returns success and a messageId for a valid number', async () => {
    const provider = new ConsoleSmsProvider();
    const result = await provider.send({ to: '+14155551234', message: 'hi' });
    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^sms_/);
    expect(result.status).toBe('sent');
  });

  it('returns failure for an invalid phone number', async () => {
    const provider = new ConsoleSmsProvider();
    const result = await provider.send({ to: 'not-a-number', message: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone number');
  });

  it('reports its name and a valid configuration', () => {
    const provider = new ConsoleSmsProvider();
    expect(provider.getName()).toBe('Console SMS Provider');
    expect(provider.validateConfiguration()).toBe(true);
  });
});

describe('SmsService', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  const buildProvider = (overrides: Partial<SmsProvider> = {}): SmsProvider => ({
    send: vi.fn().mockResolvedValue({ success: true, messageId: 'mid-1', status: 'sent' }),
    getName: () => 'TestProvider',
    validateConfiguration: () => true,
    ...overrides,
  });

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('rejects a request missing `to` or `message`', async () => {
    const service = new SmsService({ provider: buildProvider() });
    expect(await service.send({ to: '', message: 'x' })).toMatchObject({ success: false });
    expect(await service.send({ to: '+14155551234', message: '' })).toMatchObject({
      success: false,
    });
  });

  it('rejects messages over the 1600-char carrier cap', async () => {
    const service = new SmsService({ provider: buildProvider() });
    const result = await service.send({
      to: '+14155551234',
      message: 'x'.repeat(1601),
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('1600');
  });

  it('rejects an unparseable phone number before calling the provider', async () => {
    const provider = buildProvider();
    const service = new SmsService({ provider });
    const result = await service.send({ to: 'not-a-number', message: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone number');
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('normalises and forwards a valid request to the provider', async () => {
    const provider = buildProvider();
    const service = new SmsService({ provider });
    const result = await service.send({ to: '+1 (415) 555-1234', message: 'hello' });
    expect(result.success).toBe(true);
    expect(provider.send).toHaveBeenCalledWith({
      to: '+14155551234',
      message: 'hello',
    });
  });

  it('uses the default country code for un-prefixed numbers', async () => {
    const provider = buildProvider();
    const service = new SmsService({ provider, defaultCountryCode: '44' });
    await service.send({ to: '7911 123 456', message: 'hi' });
    expect(provider.send).toHaveBeenCalledWith({
      to: '+447911123456',
      message: 'hi',
    });
  });

  it('catches provider exceptions and returns failure', async () => {
    const provider = buildProvider({
      send: vi.fn().mockRejectedValue(new Error('network down')),
    });
    const service = new SmsService({ provider });
    const result = await service.send({ to: '+14155551234', message: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('network down');
  });

  it('exposes the provider name', () => {
    const provider = buildProvider();
    const service = new SmsService({ provider });
    expect(service.getProviderName()).toBe('TestProvider');
  });
});
