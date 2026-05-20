/**
 * ADS-602 — ClamAV provider behaviour against a real TCP daemon.
 *
 * The previous stub returned `{ clean: false }` unconditionally, which
 * rejected every upload in production. These tests drive the provider
 * against an in-process TCP server that speaks the clamd INSTREAM
 * protocol: EICAR strings are flagged FOUND, clean payloads come back
 * OK, and unreachable daemons surface as scan errors / failed pings.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

// setup-tests.ts globally mocks `fs`. The ClamAV provider streams files
// from disk to clamd via the real fs.createReadStream — restore the
// real module for this suite (the mock has no createReadStream).
vi.unmock('fs');

import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

import {
  ClamAvProvider,
  parseInstreamResponse,
} from '../../../services/av-providers/clamav-provider';

// EICAR is the industry-standard antivirus test string. Real ClamAV
// installs flag it; we mirror that behaviour in the mock daemon below
// so the same fixture exercises both the parser and the transport.
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

type MockDaemonOptions = {
  // When set, the daemon closes the socket the moment the client sends
  // any data. Used to simulate a broken/unreachable daemon mid-stream.
  rejectImmediately?: boolean;
  // When set, the daemon never responds, forcing the client into a
  // socket-timeout. Used to drive the scan-timeout branch.
  blackhole?: boolean;
};

type RunningDaemon = {
  port: number;
  close: () => Promise<void>;
};

/**
 * Spin up an in-process TCP server that speaks just enough of the
 * clamd protocol for these tests:
 *   - zPING\0  -> "PONG\0"
 *   - zINSTREAM\0 + framed chunks + 4-byte zero terminator ->
 *       "stream: <SIGNATURE> FOUND\0" if any chunk contains EICAR,
 *       otherwise "stream: OK\0".
 */
const startMockDaemon = (options: MockDaemonOptions = {}): Promise<RunningDaemon> =>
  new Promise((resolve, reject) => {
    const server = net.createServer(socket => {
      if (options.rejectImmediately) {
        socket.destroy();
        return;
      }
      if (options.blackhole) {
        // Read but never write back. The client must time out.
        socket.on('data', () => {});
        return;
      }

      const buffers: Buffer[] = [];
      let receivedCommand: 'PING' | 'INSTREAM' | null = null;
      let payload = Buffer.alloc(0);
      let cursor = 0;

      const handleInstreamFrames = (incoming: Buffer): void => {
        payload = Buffer.concat([payload, incoming]);
        while (cursor + 4 <= payload.length) {
          const length = payload.readUInt32BE(cursor);
          if (length === 0) {
            const dataChunks = buffers.reduce(
              (acc: Buffer, b: Buffer) => Buffer.concat([acc, b]),
              Buffer.alloc(0)
            );
            const text = dataChunks.toString('utf8');
            if (text.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
              socket.write('stream: Eicar-Test-Signature FOUND\0');
            } else {
              socket.write('stream: OK\0');
            }
            socket.end();
            return;
          }
          if (cursor + 4 + length > payload.length) {
            return; // wait for more data
          }
          buffers.push(payload.subarray(cursor + 4, cursor + 4 + length));
          cursor += 4 + length;
        }
      };

      socket.on('data', chunk => {
        if (!receivedCommand) {
          const head = chunk.toString('utf8');
          if (head.startsWith('zPING\0')) {
            receivedCommand = 'PING';
            socket.write('PONG\0');
            socket.end();
            return;
          }
          if (head.startsWith('zINSTREAM\0')) {
            receivedCommand = 'INSTREAM';
            handleInstreamFrames(chunk.subarray('zINSTREAM\0'.length));
            return;
          }
          socket.destroy();
          return;
        }
        if (receivedCommand === 'INSTREAM') {
          handleInstreamFrames(chunk);
        }
      });
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to bind mock clamd'));
        return;
      }
      resolve({
        port: address.port,
        close: () =>
          new Promise<void>(resolveClose => {
            server.close(() => resolveClose());
          }),
      });
    });
  });

const writeTempFile = (contents: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clamav-test-'));
  const file = path.join(dir, 'sample.bin');
  fs.writeFileSync(file, contents);
  return file;
};

describe('parseInstreamResponse', () => {
  it('treats OK as clean', () => {
    expect(parseInstreamResponse('stream: OK\0')).toEqual({ clean: true });
  });

  it('extracts the signature name from FOUND responses', () => {
    expect(parseInstreamResponse('stream: Eicar-Test-Signature FOUND\0')).toEqual({
      clean: false,
      details: 'infected: Eicar-Test-Signature',
    });
  });

  it('treats unknown replies as fail-closed errors', () => {
    expect(parseInstreamResponse('INSTREAM size limit exceeded. ERROR\0')).toEqual({
      clean: false,
      details: 'clamd error: INSTREAM size limit exceeded. ERROR',
    });
  });
});

describe('ClamAvProvider against a clamd-compatible mock', () => {
  let daemon: RunningDaemon | null = null;
  const tempFiles: string[] = [];

  afterEach(async () => {
    for (const file of tempFiles.splice(0)) {
      try {
        fs.unlinkSync(file);
        fs.rmdirSync(path.dirname(file));
      } catch {
        /* best-effort cleanup */
      }
    }
    if (daemon) {
      await daemon.close();
      daemon = null;
    }
  });

  it('flags an EICAR upload as infected', async () => {
    daemon = await startMockDaemon();
    const file = writeTempFile(EICAR);
    tempFiles.push(file);
    const provider = new ClamAvProvider({
      allowedRoots: [os.tmpdir()],
      host: '127.0.0.1',
      port: daemon.port,
    });

    const result = await provider.scan(file);

    expect(result.clean).toBe(false);
    expect(result.details).toContain('Eicar-Test-Signature');
  });

  it('returns clean for a benign upload', async () => {
    daemon = await startMockDaemon();
    const file = writeTempFile('hello, world\n'.repeat(50));
    tempFiles.push(file);
    const provider = new ClamAvProvider({
      allowedRoots: [os.tmpdir()],
      host: '127.0.0.1',
      port: daemon.port,
    });

    const result = await provider.scan(file);

    expect(result).toEqual({ clean: true });
  });

  it('PINGs successfully when the daemon answers PONG', async () => {
    daemon = await startMockDaemon();
    const provider = new ClamAvProvider({
      allowedRoots: [os.tmpdir()],
      host: '127.0.0.1',
      port: daemon.port,
    });

    await expect(provider.ping()).resolves.toBeUndefined();
  });

  it('ping rejects when the daemon hangs up immediately', async () => {
    daemon = await startMockDaemon({ rejectImmediately: true });
    const provider = new ClamAvProvider({
      allowedRoots: [os.tmpdir()],
      host: '127.0.0.1',
      port: daemon.port,
    });

    await expect(provider.ping()).rejects.toThrow();
  });

  it('ping rejects when no host/port is configured', async () => {
    const provider = new ClamAvProvider({ allowedRoots: [os.tmpdir()] });
    await expect(provider.ping()).rejects.toThrow(/misconfigured/);
  });

  it('scan returns a fail-closed error when no host/port is configured', async () => {
    const provider = new ClamAvProvider({ allowedRoots: [os.tmpdir()] });
    const result = await provider.scan('/tmp/whatever');
    expect(result.clean).toBe(false);
    expect(result.details).toMatch(/misconfigured/);
  });

  it('scan returns a fail-closed error when the daemon is unreachable', async () => {
    // Bind then immediately close to get a guaranteed-free port.
    const ephemeral = await startMockDaemon();
    const port = ephemeral.port;
    await ephemeral.close();
    daemon = null;
    const provider = new ClamAvProvider({ allowedRoots: [os.tmpdir()], host: '127.0.0.1', port });

    const file = writeTempFile('ok');
    tempFiles.push(file);

    const result = await provider.scan(file);

    expect(result.clean).toBe(false);
    expect(result.details).toMatch(/ClamAV scan error/);
  });

  it('scan times out when the daemon never replies', async () => {
    daemon = await startMockDaemon({ blackhole: true });
    const provider = new ClamAvProvider({
      allowedRoots: [os.tmpdir()],
      host: '127.0.0.1',
      port: daemon.port,
      timeoutMs: 100,
    });
    const file = writeTempFile('payload');
    tempFiles.push(file);

    const result = await provider.scan(file);

    expect(result.clean).toBe(false);
    expect(result.details).toMatch(/timed out/);
  });

  it('reports its name as clamav and validates configuration', () => {
    const provider = new ClamAvProvider({
      allowedRoots: [os.tmpdir()],
      host: '127.0.0.1',
      port: 3310,
    });
    expect(provider.getName()).toBe('clamav');
    expect(provider.validateConfiguration()).toBe(true);
    expect(new ClamAvProvider({ allowedRoots: [os.tmpdir()] }).validateConfiguration()).toBe(false);
  });

  it('scan rejects a path that points to a directory', async () => {
    daemon = await startMockDaemon();
    const provider = new ClamAvProvider({
      allowedRoots: [os.tmpdir()],
      host: '127.0.0.1',
      port: daemon.port,
    });

    const result = await provider.scan(os.tmpdir());

    expect(result.clean).toBe(false);
    expect(result.details).toMatch(/not a regular file/);
  });

  it('scan rejects a non-existent path before opening any socket', async () => {
    const provider = new ClamAvProvider({
      allowedRoots: [os.tmpdir()],
      host: '127.0.0.1',
      port: 65535,
    });

    const result = await provider.scan(
      path.join(os.tmpdir(), `clamav-missing-${Date.now()}-${Math.random()}`)
    );

    expect(result.clean).toBe(false);
    expect(result.details).toMatch(/not accessible/);
  });
});
