// Result of scanning one file's bytes. `signature` is only present when
// `clean` is false — the name clamd reported for the match (e.g.
// "Win.Test.EICAR_HDB-1").
export type ScanResult = { clean: boolean; signature?: string };

export type AvScanClient = {
  scanBytes(buffer: Buffer): Promise<ScanResult>;
};

export type AvScanConfig = {
  // clamd host/port. No defaults here — deployment-specific, so callers
  // (e.g. the gateway) supply them from their own config/env.
  host: string;
  port: number;
  // Max time to wait for a scan response before treating the scanner as
  // unreachable. Defaults to 10s.
  timeoutMs?: number;
  // Policy for when the scanner can't be reached, or replies with
  // something other than a clean OK/FOUND verdict: reject the file
  // (fail CLOSED) or treat it as clean (fail OPEN)? Defaults to true
  // (fail closed) — scanning must never be silently bypassed. Set to
  // false only for local/dev environments that don't run clamd; this
  // must never be false in production (see the gateway's config.ts,
  // which hard-enforces true there regardless of env vars).
  failClosed?: boolean;
};

export type SendInstreamOptions = {
  host: string;
  port: number;
  timeoutMs: number;
};

// Sends `buffer` to clamd over its INSTREAM TCP protocol and resolves with
// the raw response text (e.g. "stream: OK", "stream: <sig> FOUND"). This is
// the transport seam createAvScanClient depends on — tests inject a fake
// implementation so they never need a live clamd (ADS-1241).
export type SendInstreamFn = (buffer: Buffer, opts: SendInstreamOptions) => Promise<string>;
