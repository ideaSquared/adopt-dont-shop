import { createHash } from 'node:crypto';

import { canonicalJson } from './canonical-json.js';

// The access log is hash-chained: each row's hash covers the previous row's
// hash and its own content, so deleting or editing any row breaks every hash
// after it. (The database also rejects UPDATE/DELETE/TRUNCATE outright.)

export const GENESIS_HASH = '0'.repeat(64);

export type AccessLogEntry = {
  at: string; // ISO 8601, millisecond precision
  operatorId: string;
  rpc: string;
  kind: 'read' | 'write';
  mode: 'run' | 'preview' | 'execute';
  outcome: 'ok' | 'error';
  errorCode: string | null;
  planId: string | null;
  unlockId: string | null;
  revealedFields: readonly string[];
  requestHash: string | null;
};

export const sha256Hex = (input: string): string =>
  createHash('sha256').update(input, 'utf8').digest('hex');

export const computeEntryHash = (prevHash: string, entry: AccessLogEntry): string =>
  sha256Hex(prevHash + canonicalJson(entry));

export type ChainedEntry = AccessLogEntry & { prevHash: string; hash: string };

export const chainEntry = (prevHash: string | null, entry: AccessLogEntry): ChainedEntry => {
  const prev = prevHash ?? GENESIS_HASH;
  return { ...entry, prevHash: prev, hash: computeEntryHash(prev, entry) };
};

// True when every row links to its predecessor and its own hash recomputes.
export const verifyChain = (rows: readonly ChainedEntry[]): boolean =>
  rows.every((row, index) => {
    const expectedPrev = index === 0 ? GENESIS_HASH : rows[index - 1].hash;
    const { prevHash, hash, ...entry } = row;
    return prevHash === expectedPrev && hash === computeEntryHash(prevHash, entry);
  });
