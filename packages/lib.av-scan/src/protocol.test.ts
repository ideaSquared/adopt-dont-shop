import net from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { defaultSendInstream } from './protocol.js';

// Minimal fake clamd: accepts one INSTREAM session, reassembles the framed
// chunks per the real wire protocol (4-byte big-endian length prefix per
// chunk, zero-length chunk terminates), and replies with whatever
// `respond` computes from the reassembled bytes. This exercises
// defaultSendInstream's real node:net implementation end-to-end without
// needing a live ClamAV daemon (ADS-1241).
function startFakeClamd(
  respond: (received: Buffer) => string
): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      let buf = Buffer.alloc(0);
      let sawCommand = false;
      const chunks: Buffer[] = [];

      socket.on('data', (data) => {
        buf = Buffer.concat([buf, data]);
        if (!sawCommand) {
          const idx = buf.indexOf('\n');
          if (idx === -1) return;
          sawCommand = true;
          buf = buf.subarray(idx + 1);
        }
        for (;;) {
          if (buf.length < 4) return;
          const len = buf.readUInt32BE(0);
          if (len === 0) {
            socket.end(respond(Buffer.concat(chunks)));
            return;
          }
          if (buf.length < 4 + len) return;
          chunks.push(buf.subarray(4, 4 + len));
          buf = buf.subarray(4 + len);
        }
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('expected a TCP address'));
        return;
      }
      resolve({
        port: address.port,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}

describe('defaultSendInstream', () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it('frames the payload as one length-prefixed chunk and returns the raw response', async () => {
    const fake = await startFakeClamd((received) => {
      expect(received.toString('utf8')).toBe('hello world');
      return 'stream: OK\n';
    });
    close = fake.close;

    const response = await defaultSendInstream(Buffer.from('hello world'), {
      host: '127.0.0.1',
      port: fake.port,
      timeoutMs: 2000,
    });

    expect(response.trim()).toBe('stream: OK');
  });

  it('sends a bare terminator chunk for an empty buffer', async () => {
    const fake = await startFakeClamd((received) => {
      expect(received.length).toBe(0);
      return 'stream: OK\n';
    });
    close = fake.close;

    const response = await defaultSendInstream(Buffer.alloc(0), {
      host: '127.0.0.1',
      port: fake.port,
      timeoutMs: 2000,
    });

    expect(response.trim()).toBe('stream: OK');
  });

  it('surfaces an infected verdict from the fake server unchanged', async () => {
    const fake = await startFakeClamd(() => 'stream: Win.Test.EICAR_HDB-1 FOUND\n');
    close = fake.close;

    const response = await defaultSendInstream(Buffer.from('X5O!P%@AP'), {
      host: '127.0.0.1',
      port: fake.port,
      timeoutMs: 2000,
    });

    expect(response.trim()).toBe('stream: Win.Test.EICAR_HDB-1 FOUND');
  });

  it('rejects when the server accepts the connection but never replies before the timeout', async () => {
    // Track accepted sockets so `close` can destroy them explicitly. A
    // plain server.close() waits for every connection to end on its own —
    // net.Server (unlike http.Server) has no closeAllConnections() helper —
    // and this server never ends the connection itself.
    const sockets = new Set<net.Socket>();
    const server = net.createServer((socket) => {
      // Accept the connection but deliberately never write a response.
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    await new Promise<void>((res) => server.listen(0, '127.0.0.1', res));
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('expected a TCP address');
    }
    close = () =>
      new Promise((res) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => res());
      });

    await expect(
      defaultSendInstream(Buffer.from('x'), {
        host: '127.0.0.1',
        port: address.port,
        timeoutMs: 50,
      })
    ).rejects.toThrow(/timed out/);
  });

  it('rejects when nothing is listening on the target port', async () => {
    // Bind an ephemeral port, close it immediately, then connect — the OS
    // reliably refuses a connection to a port nothing is bound to.
    const probe = net.createServer();
    const port = await new Promise<number>((res, rej) => {
      probe.on('error', rej);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        if (address === null || typeof address === 'string') {
          rej(new Error('expected a TCP address'));
          return;
        }
        res(address.port);
      });
    });
    await new Promise<void>((res) => probe.close(() => res()));

    await expect(
      defaultSendInstream(Buffer.from('x'), { host: '127.0.0.1', port, timeoutMs: 2000 })
    ).rejects.toThrow();
  });
});
