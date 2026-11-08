import { describe, expect, it } from 'vitest';

import { chainEntry, GENESIS_HASH, verifyChain, type AccessLogEntry } from './access-chain.js';
import { canonicalJson } from './canonical-json.js';

const entry = (rpc: string): AccessLogEntry => ({
  at: '2026-01-01T00:00:00.000Z',
  operatorId: 'op',
  rpc,
  kind: 'read',
  mode: 'run',
  outcome: 'ok',
  errorCode: null,
  planId: null,
  unlockId: null,
  revealedFields: [],
  requestHash: null,
});

const build = (rpcs: string[]) =>
  rpcs.reduce<ReturnType<typeof chainEntry>[]>(
    (rows, rpc) => [...rows, chainEntry(rows.at(-1)?.hash ?? null, entry(rpc))],
    []
  );

describe('access log hash chain', () => {
  it('starts from the genesis hash and links each row to its predecessor', () => {
    const rows = build(['a.A', 'a.B', 'a.C']);
    expect(rows[0].prevHash).toBe(GENESIS_HASH);
    expect(rows[1].prevHash).toBe(rows[0].hash);
    expect(rows[2].prevHash).toBe(rows[1].hash);
    expect(verifyChain(rows)).toBe(true);
  });

  it('is deterministic regardless of key order', () => {
    const a = chainEntry(null, entry('a.A'));
    const reordered = Object.fromEntries(Object.entries(entry('a.A')).reverse()) as AccessLogEntry;
    expect(chainEntry(null, reordered).hash).toBe(a.hash);
  });

  it('detects an edited row, a deleted row and a reordered chain', () => {
    const rows = build(['a.A', 'a.B', 'a.C']);
    expect(verifyChain([rows[0], { ...rows[1], rpc: 'x.X' }, rows[2]])).toBe(false);
    expect(verifyChain([rows[0], rows[2]])).toBe(false);
    expect(verifyChain([rows[1], rows[0], rows[2]])).toBe(false);
  });
});

describe('canonicalJson', () => {
  it('sorts keys recursively and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, undefined], c: 'x' }, u: undefined })).toBe(
      '{"a":{"c":"x","d":[3,null]},"b":1}'
    );
  });
});
