import { describe, expect, it, vi } from 'vitest';

const connectMock = vi.fn(async () => ({ id: 'fake-connection' }));

vi.mock('nats', () => ({
  connect: (...args: unknown[]) => connectMock(...args),
}));

import {
  buildNatsConnectionOptions,
  connectNats,
  MIN_NATS_AUTH_TOKEN_BYTES,
} from './nats-client.js';

const VALID_TOKEN = 'a'.repeat(MIN_NATS_AUTH_TOKEN_BYTES);

describe('buildNatsConnectionOptions', () => {
  it('builds connection options carrying the shared auth token', () => {
    const options = buildNatsConnectionOptions('nats://nats:4222', {
      NATS_AUTH_TOKEN: VALID_TOKEN,
    });
    expect(options).toEqual({ servers: 'nats://nats:4222', token: VALID_TOKEN });
  });

  it('throws when NATS_AUTH_TOKEN is missing', () => {
    expect(() => buildNatsConnectionOptions('nats://nats:4222', {})).toThrowError(
      /NATS_AUTH_TOKEN is required/
    );
  });

  it('throws when NATS_AUTH_TOKEN is shorter than the minimum byte floor', () => {
    expect(() =>
      buildNatsConnectionOptions('nats://nats:4222', { NATS_AUTH_TOKEN: 'too-short' })
    ).toThrowError(/NATS_AUTH_TOKEN must be at least/);
  });
});

describe('connectNats', () => {
  it('connects with the shared token resolved from the environment', async () => {
    const originalEnv = process.env.NATS_AUTH_TOKEN;
    process.env.NATS_AUTH_TOKEN = VALID_TOKEN;
    try {
      await connectNats('nats://nats:4222');
      expect(connectMock).toHaveBeenCalledWith({ servers: 'nats://nats:4222', token: VALID_TOKEN });
    } finally {
      process.env.NATS_AUTH_TOKEN = originalEnv;
    }
  });

  it('rejects before ever calling connect() when the token is missing', async () => {
    const originalEnv = process.env.NATS_AUTH_TOKEN;
    delete process.env.NATS_AUTH_TOKEN;
    connectMock.mockClear();
    try {
      await expect(connectNats('nats://nats:4222')).rejects.toThrowError(
        /NATS_AUTH_TOKEN is required/
      );
      expect(connectMock).not.toHaveBeenCalled();
    } finally {
      process.env.NATS_AUTH_TOKEN = originalEnv;
    }
  });
});
