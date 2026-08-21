import { describe, expect, it, vi } from 'vitest';

import { createAvScanClient } from './client.js';
import { AvScanUnavailableError } from './errors.js';
import type { SendInstreamFn } from './types.js';

// The standard EICAR antivirus test string — a safe, non-malicious 68-byte
// signature every AV engine (including ClamAV) is designed to flag. Used
// here as realistic input for the fake transport below; no real scanning
// happens in this file — ADS-1241 requires the lib's own tests never
// depend on a live clamd, so the transport is always injected.
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

const CONFIG = { host: 'clamav', port: 3310 };

describe('createAvScanClient', () => {
  it('reports a clean file when clamd replies OK', async () => {
    const sendInstream: SendInstreamFn = vi.fn().mockResolvedValue('stream: OK\n');
    const client = createAvScanClient(CONFIG, { sendInstream });

    await expect(client.scanBytes(Buffer.from('hello'))).resolves.toEqual({ clean: true });
  });

  it('rejects the EICAR test file and surfaces the reported signature', async () => {
    const sendInstream: SendInstreamFn = vi
      .fn()
      .mockResolvedValue('stream: Win.Test.EICAR_HDB-1 FOUND\n');
    const client = createAvScanClient(CONFIG, { sendInstream });

    await expect(client.scanBytes(Buffer.from(EICAR))).resolves.toEqual({
      clean: false,
      signature: 'Win.Test.EICAR_HDB-1',
    });
  });

  it('passes the exact scanned bytes and connection details to the transport', async () => {
    const sendInstream: SendInstreamFn = vi.fn().mockResolvedValue('stream: OK\n');
    const client = createAvScanClient(CONFIG, { sendInstream });
    const payload = Buffer.from(EICAR);

    await client.scanBytes(payload);

    expect(sendInstream).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ host: 'clamav', port: 3310, timeoutMs: 10_000 })
    );
  });

  it('honours a custom timeoutMs', async () => {
    const sendInstream: SendInstreamFn = vi.fn().mockResolvedValue('stream: OK\n');
    const client = createAvScanClient({ ...CONFIG, timeoutMs: 500 }, { sendInstream });

    await client.scanBytes(Buffer.from('x'));

    expect(sendInstream).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ timeoutMs: 500 })
    );
  });

  it('fails CLOSED by default when the scanner is unreachable', async () => {
    const sendInstream: SendInstreamFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = createAvScanClient(CONFIG, { sendInstream });

    const scanned = client.scanBytes(Buffer.from('x'));

    await expect(scanned).rejects.toBeInstanceOf(AvScanUnavailableError);
    await expect(scanned).rejects.toThrow(/unreachable at clamav:3310/);
  });

  it('still surfaces a reason when the transport rejects with a non-Error value', async () => {
    // Promise rejections aren't required to be Error instances — a rogue
    // injected transport could reject with a plain string.
    const sendInstream: SendInstreamFn = vi.fn().mockRejectedValue('connection refused');
    const client = createAvScanClient(CONFIG, { sendInstream });

    await expect(client.scanBytes(Buffer.from('x'))).rejects.toThrow(/connection refused/);
  });

  it('fails closed explicitly when failClosed is true', async () => {
    const sendInstream: SendInstreamFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = createAvScanClient({ ...CONFIG, failClosed: true }, { sendInstream });

    await expect(client.scanBytes(Buffer.from('x'))).rejects.toBeInstanceOf(AvScanUnavailableError);
  });

  it('fails OPEN (treats the file as clean) when failClosed is false', async () => {
    const sendInstream: SendInstreamFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = createAvScanClient({ ...CONFIG, failClosed: false }, { sendInstream });

    await expect(client.scanBytes(Buffer.from('x'))).resolves.toEqual({ clean: true });
  });

  it('treats a timed-out scan as scanner-unreachable (fails closed)', async () => {
    const sendInstream: SendInstreamFn = vi
      .fn()
      .mockRejectedValue(new Error('AV scan timed out after 10000ms (clamav:3310)'));
    const client = createAvScanClient(CONFIG, { sendInstream });

    await expect(client.scanBytes(Buffer.from('x'))).rejects.toBeInstanceOf(AvScanUnavailableError);
  });

  it('treats an unparseable clamd response as scanner-unreachable (fails closed)', async () => {
    const sendInstream: SendInstreamFn = vi.fn().mockResolvedValue('garbage\n');
    const client = createAvScanClient(CONFIG, { sendInstream });

    await expect(client.scanBytes(Buffer.from('x'))).rejects.toBeInstanceOf(AvScanUnavailableError);
  });

  it('treats an unparseable clamd response as clean when failClosed is false', async () => {
    const sendInstream: SendInstreamFn = vi.fn().mockResolvedValue('garbage\n');
    const client = createAvScanClient({ ...CONFIG, failClosed: false }, { sendInstream });

    await expect(client.scanBytes(Buffer.from('x'))).resolves.toEqual({ clean: true });
  });

  it('defaults to the real TCP transport when none is injected', () => {
    // Construction alone must not touch the network — only scanBytes()
    // does, and that is exercised against a real (fake) TCP server in
    // protocol.test.ts. This just proves the factory doesn't require a
    // transport to be supplied.
    expect(() => createAvScanClient(CONFIG)).not.toThrow();
  });
});
