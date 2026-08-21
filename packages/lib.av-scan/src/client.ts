import { AvScanUnavailableError } from './errors.js';
import { defaultSendInstream } from './protocol.js';
import type { AvScanClient, AvScanConfig, ScanResult, SendInstreamFn } from './types.js';

const DEFAULT_TIMEOUT_MS = 10_000;

export type CreateAvScanClientDeps = {
  // Injectable transport seam (defaults to the real TCP implementation).
  // Tests supply a fake here so they never need a live clamd (ADS-1241).
  sendInstream?: SendInstreamFn;
};

// Config-injected clamd client factory — mirrors
// @adopt-dont-shop/storage's createStorageProvider(config) shape. Callers
// own where the config comes from; there is no global config import.
export const createAvScanClient = (
  config: AvScanConfig,
  deps: CreateAvScanClientDeps = {}
): AvScanClient => {
  const sendInstream = deps.sendInstream ?? defaultSendInstream;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const failClosed = config.failClosed ?? true;

  return {
    async scanBytes(buffer: Buffer): Promise<ScanResult> {
      try {
        const raw = await sendInstream(buffer, { host: config.host, port: config.port, timeoutMs });
        return parseScanResponse(raw);
      } catch (err) {
        if (!failClosed) {
          return { clean: true };
        }
        const reason = err instanceof Error ? err.message : String(err);
        throw new AvScanUnavailableError(
          `AV scanner unreachable at ${config.host}:${config.port}: ${reason}`
        );
      }
    },
  };
};

// clamd's INSTREAM reply is one line: "stream: OK", "stream: <signature>
// FOUND", or "stream: <message> ERROR" (plus a trailing \n or \0 depending
// on which command prefix was used — stripped here so either works). Any
// other shape means we didn't get a definitive verdict, which is handled
// identically to a transport failure by the caller above (fail
// open/closed per config).
function parseScanResponse(raw: string): ScanResult {
  const text = raw.replace(/\0/g, '').trim();
  if (text.endsWith('OK')) {
    return { clean: true };
  }
  const found = text.match(/:\s*(.+?)\s+FOUND$/);
  if (found) {
    return { clean: false, signature: found[1] };
  }
  throw new Error(`unexpected clamd response: ${JSON.stringify(text)}`);
}
