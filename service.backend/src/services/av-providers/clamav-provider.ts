import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';

import { logger } from '../../utils/logger';
import { BaseAvProvider, ScanResult } from './base-provider';

export type ClamAvConfig = {
  host?: string;
  port?: number;
  timeoutMs?: number;
  // Absolute directories that scan targets must live inside. The factory
  // populates this with the configured upload root; tests pass their tmp
  // dir. The provider rejects any path that resolves outside this list,
  // which is also the CodeQL-recognised sanitiser for the fs reads below.
  allowedRoots: readonly string[];
};

// ClamAV INSTREAM chunk size. 64 KiB is well under the daemon's default
// StreamMaxLength and keeps memory usage flat for arbitrarily large files.
const CLAMAV_CHUNK_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * ClamAV provider. Talks to clamd directly via its INSTREAM protocol so
 * no native binding is required.
 *
 * Protocol reference: clamd(8). We use the `z<cmd>\0` form which is
 * NUL-terminated and survives stale newlines in the stream.
 *
 * `ping()` is exposed so startup can verify the daemon is actually
 * reachable before the first upload arrives (ADS-602).
 */
export class ClamAvProvider extends BaseAvProvider {
  private readonly config: ClamAvConfig;

  constructor(config: ClamAvConfig) {
    super();
    this.config = config;
  }

  async scan(filePath: string): Promise<ScanResult> {
    const host = this.config.host;
    const port = this.config.port;
    if (!host || !port) {
      return { clean: false, details: 'ClamAV provider misconfigured: host/port missing' };
    }

    // Canonicalise and confirm the scan target sits inside an allowed
    // root before any fs read. Use realpath to resolve symlinks so a file
    // inside an allowed directory cannot escape via symlink traversal.
    let resolvedPath: string;
    try {
      resolvedPath = fs.realpathSync(path.resolve(filePath));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { clean: false, details: `ClamAV scan target not accessible: ${message}` };
    }

    const inAllowedRoot = this.config.allowedRoots.some(root => {
      try {
        const canonicalRoot = fs.realpathSync(path.resolve(root));
        const rootWithSep = canonicalRoot.endsWith(path.sep)
          ? canonicalRoot
          : `${canonicalRoot}${path.sep}`;
        return resolvedPath === canonicalRoot || resolvedPath.startsWith(rootWithSep);
      } catch {
        return false;
      }
    });
    if (!inAllowedRoot) {
      return { clean: false, details: 'ClamAV scan target is outside the allowed upload roots' };
    }
    try {
      // lgtm[js/path-injection] - resolvedPath is realpathSync'd and confirmed inside an allowedRoots prefix above.
      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile()) {
        return { clean: false, details: 'ClamAV scan target is not a regular file' };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { clean: false, details: `ClamAV scan target not accessible: ${message}` };
    }

    // Capture the validated path in a stream factory so runInstream never
    // takes the path itself as a parameter — keeps the fs.createReadStream
    // sink right next to the sanitiser above for CodeQL's data-flow trace.
    const openStream = (): fs.ReadStream =>
      // lgtm[js/path-injection] - resolvedPath is realpathSync'd and confirmed inside an allowedRoots prefix above.
      fs.createReadStream(resolvedPath, { highWaterMark: CLAMAV_CHUNK_BYTES });

    try {
      const response = await this.runInstream(host, port, openStream);
      return parseInstreamResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('ClamAV scan failed', { filePath: resolvedPath, host, port, error: message });
      return { clean: false, details: `ClamAV scan error: ${message}` };
    }
  }

  /**
   * Send a PING to clamd and expect PONG. Throws on any other reply,
   * a connection error, or a timeout. Used as a startup smoke check.
   */
  async ping(): Promise<void> {
    const host = this.config.host;
    const port = this.config.port;
    if (!host || !port) {
      throw new Error('ClamAV provider misconfigured: host/port missing');
    }
    const response = await this.sendCommand(host, port, 'zPING\0');
    const trimmed = response.replace(/\0+$/, '').trim();
    if (trimmed !== 'PONG') {
      throw new Error(`Unexpected PING response from clamd: ${JSON.stringify(trimmed)}`);
    }
  }

  getName(): string {
    return 'clamav';
  }

  validateConfiguration(): boolean {
    return Boolean(this.config.host && this.config.port);
  }

  private get timeoutMs(): number {
    return this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Open a connection, write `command`, collect the reply, close.
   */
  private sendCommand(host: string, port: number, command: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      const chunks: Buffer[] = [];
      const cleanup = (): void => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.setTimeout(this.timeoutMs);
      socket.once('connect', () => {
        socket.write(command);
      });
      socket.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      socket.once('end', () => {
        cleanup();
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
      socket.once('timeout', () => {
        cleanup();
        reject(new Error(`ClamAV request timed out after ${this.timeoutMs}ms`));
      });
      socket.once('error', err => {
        cleanup();
        reject(err);
      });
    });
  }

  /**
   * Stream a file to clamd via the INSTREAM command. clamd replies with
   * a single line once the terminator chunk is received.
   *
   * Takes a stream factory rather than a path so the fs read sink lives
   * in scan() next to the path sanitiser, not here behind a parameter
   * boundary that CodeQL's data-flow trace can't cross cleanly.
   */
  private runInstream(
    host: string,
    port: number,
    openStream: () => fs.ReadStream
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      const chunks: Buffer[] = [];
      let fileStream: fs.ReadStream | null = null;
      let settled = false;
      const settle = (action: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        socket.removeAllListeners();
        if (fileStream) {
          fileStream.removeAllListeners();
          fileStream.destroy();
        }
        socket.destroy();
        action();
      };

      socket.setTimeout(this.timeoutMs);
      socket.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      socket.once('end', () => {
        settle(() => resolve(Buffer.concat(chunks).toString('utf8')));
      });
      socket.once('timeout', () => {
        settle(() => reject(new Error(`ClamAV INSTREAM timed out after ${this.timeoutMs}ms`)));
      });
      socket.once('error', err => {
        settle(() => reject(err));
      });

      socket.once('connect', () => {
        socket.write('zINSTREAM\0');
        fileStream = openStream();
        fileStream.on('data', data => {
          // Coerce string-mode reads to Buffer so the length prefix is correct.
          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
          const header = Buffer.alloc(4);
          header.writeUInt32BE(buf.length, 0);
          socket.write(header);
          socket.write(buf);
        });
        fileStream.once('end', () => {
          // Zero-length chunk signals end-of-stream to clamd.
          const terminator = Buffer.alloc(4);
          socket.write(terminator);
        });
        fileStream.once('error', err => {
          settle(() => reject(err));
        });
      });
    });
  }
}

/**
 * Parse a clamd INSTREAM reply.
 *
 * Examples:
 *   "stream: OK\0"                          -> clean
 *   "stream: Eicar-Test-Signature FOUND\0"  -> infected
 *   "INSTREAM size limit exceeded. ERROR\0" -> error
 */
export function parseInstreamResponse(raw: string): ScanResult {
  const trimmed = raw.replace(/\0+$/, '').trim();
  if (/\bFOUND$/.test(trimmed)) {
    const signature = trimmed.replace(/^stream:\s*/, '').replace(/\s+FOUND$/, '');
    return { clean: false, details: `infected: ${signature}` };
  }
  if (/\bOK$/.test(trimmed)) {
    return { clean: true };
  }
  return { clean: false, details: `clamd error: ${trimmed}` };
}
