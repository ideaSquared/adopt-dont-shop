import { readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MigrationBuilder } from 'node-pg-migrate';
import { describe, expect, it } from 'vitest';

const DIR = dirname(fileURLToPath(import.meta.url));
const PATTERN = /^\d{3}_[a-z0-9_]+\.ts$/;

const files = async (): Promise<string[]> =>
  (await readdir(DIR)).filter(f => PATTERN.test(f)).sort((a, b) => a.localeCompare(b));

// DDL rendering only needs a MigrationBuilder; nothing is run against Postgres.
const noopDb = { query: async () => ({ rows: [] }), select: async () => [] } as never;

const render = async (file: string): Promise<string> => {
  const mod = (await import(`./${file}`)) as { up: (pgm: MigrationBuilder) => Promise<void> };
  const pgm = new MigrationBuilder(noopDb, undefined, false, console);
  await mod.up(pgm);
  return pgm.getSql();
};

describe('ops migrations', () => {
  it('are numbered sequentially, snake_case, and export up/down', async () => {
    const all = await files();
    expect(all).toHaveLength(6);
    for (const [i, f] of all.entries()) {
      expect(Number.parseInt(f.slice(0, 3), 10)).toBe(i + 1);
      const mod = (await import(`./${f}`)) as { up: unknown; down: unknown };
      expect(typeof mod.up).toBe('function');
      expect(typeof mod.down).toBe('function');
    }
  });

  it('makes access_log immutable with no escape hatch', async () => {
    const sql = await render('005_create_access_log.ts');
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON .*access_log.* FOR EACH ROW/s);
    expect(sql).toMatch(/BEFORE TRUNCATE ON .*access_log/s);
    expect(sql).toContain('RAISE EXCEPTION');
    expect(sql).not.toMatch(/current_setting|session_user|current_user/i);
  });

  it('stores only token hashes for sessions and constrains unlock subjects', async () => {
    const sessions = await render('002_create_sessions.ts');
    expect(sessions).toContain('token_hash');
    expect(sessions).not.toMatch(/"token"/);
    expect(await render('004_create_unlocks.ts')).toContain("subject_type = 'any'");
  });

  it('creates the event outbox', async () => {
    expect(await render('006_create_event_outbox.ts')).toContain('event_outbox');
  });
});
