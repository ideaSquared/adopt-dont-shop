/**
 * ADS-602 — startup smoke check.
 *
 * `initializeAvProvider()` must reject when AV_PROVIDER=clamav but the
 * daemon cannot be reached, so a misconfigured deploy fails boot rather
 * than rejecting 100% of uploads at request time. For the noop provider
 * the call is a no-op (used in dev/test).
 */
import * as net from 'net';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Resetters = {
  reset: () => void;
};

const setupModuleWith = async (configOverrides: {
  provider: string;
  host?: string;
  port?: number;
  timeoutMs?: number;
}): Promise<Resetters & { initializeAvProvider: () => Promise<void> }> => {
  vi.resetModules();
  vi.doMock('../../../config', () => ({
    config: {
      av: {
        provider: configOverrides.provider,
        clamav: {
          host: configOverrides.host,
          port: configOverrides.port,
          timeoutMs: configOverrides.timeoutMs ?? 500,
        },
      },
      storage: { local: { directory: 'uploads' } },
    },
  }));
  const mod = await import('../../../services/av-providers');
  return {
    initializeAvProvider: mod.initializeAvProvider,
    reset: () => mod.resetAvProviderForTests(),
  };
};

describe('initializeAvProvider [ADS-602]', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.doUnmock('../../../config');
  });

  it('is a no-op for the noop provider', async () => {
    process.env.NODE_ENV = 'development';
    const { initializeAvProvider, reset } = await setupModuleWith({ provider: 'noop' });
    await expect(initializeAvProvider()).resolves.toBeUndefined();
    reset();
  });

  it('rejects when AV_PROVIDER=clamav but the daemon is unreachable', async () => {
    process.env.NODE_ENV = 'development';
    // Reserve a port then immediately close so connect() refuses.
    const reservation = await new Promise<{ port: number; close: () => Promise<void> }>(
      (resolve, reject) => {
        const srv = net.createServer();
        srv.once('error', reject);
        srv.listen(0, '127.0.0.1', () => {
          const addr = srv.address();
          if (!addr || typeof addr === 'string') {
            reject(new Error('Failed to bind reservation socket'));
            return;
          }
          resolve({
            port: addr.port,
            close: () =>
              new Promise<void>(done => {
                srv.close(() => done());
              }),
          });
        });
      }
    );
    await reservation.close();

    const { initializeAvProvider, reset } = await setupModuleWith({
      provider: 'clamav',
      host: '127.0.0.1',
      port: reservation.port,
    });

    await expect(initializeAvProvider()).rejects.toThrow();
    reset();
  });

  it('resolves when the clamav daemon answers PONG', async () => {
    process.env.NODE_ENV = 'development';

    const server = net.createServer(socket => {
      socket.on('data', chunk => {
        if (chunk.toString('utf8').startsWith('zPING\0')) {
          socket.write('PONG\0');
          socket.end();
        }
      });
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
          reject(new Error('Failed to bind'));
          return;
        }
        resolve(addr.port);
      });
    });

    const { initializeAvProvider, reset } = await setupModuleWith({
      provider: 'clamav',
      host: '127.0.0.1',
      port,
    });

    await expect(initializeAvProvider()).resolves.toBeUndefined();
    reset();
    await new Promise<void>(done => server.close(() => done()));
  });

  it('rejects clamav at construction time when host/port are missing', async () => {
    process.env.NODE_ENV = 'development';
    const { initializeAvProvider, reset } = await setupModuleWith({ provider: 'clamav' });
    await expect(initializeAvProvider()).rejects.toThrow(
      /CLAMAV_HOST and CLAMAV_PORT are required/
    );
    reset();
  });
});
