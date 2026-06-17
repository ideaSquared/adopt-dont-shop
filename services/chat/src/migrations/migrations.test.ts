import { readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MigrationBuilder } from 'node-pg-migrate';
import { describe, expect, it, vi } from 'vitest';

// Smoke tests for the migration files in this directory. We don't run
// them against a real Postgres here — @adopt-dont-shop/db is already
// tested for the runner contract, and the migrations get exercised
// end-to-end by the docker-compose stack smoke (Phase 6.6).
//
// This file guards the things that break silently:
//   - every migration exports `up` and `down` functions
//   - the file naming convention stays consistent (lexicographic =
//     execution order; node-pg-migrate sorts the dir scan by filename)

const MIGRATIONS_DIR = dirname(fileURLToPath(import.meta.url));
const MIGRATION_FILENAME_PATTERN = /^\d{3}_[a-z0-9_]+\.ts$/;

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter(f => MIGRATION_FILENAME_PATTERN.test(f)).sort((a, b) => a.localeCompare(b));
}

describe('chat migrations', () => {
  it('has migration files following the NNN_snake_case.ts naming convention', async () => {
    const files = await listMigrationFiles();
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const f of files) {
      expect(f).toMatch(MIGRATION_FILENAME_PATTERN);
    }
  });

  it('numbers migrations sequentially without gaps', async () => {
    const files = await listMigrationFiles();
    const numbers = files.map(f => Number.parseInt(f.slice(0, 3), 10));
    for (let i = 0; i < numbers.length; i++) {
      expect(numbers[i]).toBe(i + 1);
    }
  });

  it.each([
    '001_create_chats.ts',
    '002_create_chat_participants.ts',
    '003_create_messages.ts',
    '004_install_messages_search_vector_trigger.ts',
    '005_create_message_reactions.ts',
    '006_create_message_reads.ts',
  ])('%s exports `up` and `down` functions', async filename => {
    const mod = (await import(`./${filename}`)) as {
      up: unknown;
      down: unknown;
    };
    expect(typeof mod.up).toBe('function');
    expect(typeof mod.down).toBe('function');
  });

  // Drive each migration's up/down against a mocked MigrationBuilder (the
  // node-pg-migrate boundary — no live Postgres). This exercises the table /
  // index / type / trigger DDL the runner would emit and guards against a
  // migration body that references a builder method incorrectly. We don't
  // assert exact DDL strings (that would couple to implementation detail);
  // we assert the observable contract: up creates objects, down tears them
  // down, and the builder is driven without throwing.
  function makePgmMock(): {
    pgm: MigrationBuilder;
    spies: Record<string, ReturnType<typeof vi.fn>>;
  } {
    const spies = {
      createType: vi.fn(),
      createTable: vi.fn(),
      createIndex: vi.fn(),
      sql: vi.fn(),
      dropTable: vi.fn(),
      dropType: vi.fn(),
      // func returns an opaque marker the column defaults reference.
      func: vi.fn((expr: string) => ({ __pgFunc: expr })),
    };
    return { pgm: spies as unknown as MigrationBuilder, spies };
  }

  it.each([
    '001_create_chats.ts',
    '002_create_chat_participants.ts',
    '003_create_messages.ts',
    '004_install_messages_search_vector_trigger.ts',
    '005_create_message_reactions.ts',
    '006_create_message_reads.ts',
  ])('%s up() drives the builder to create schema objects', async filename => {
    const mod = (await import(`./${filename}`)) as {
      up: (pgm: MigrationBuilder) => Promise<void>;
    };
    const { pgm, spies } = makePgmMock();

    await expect(mod.up(pgm)).resolves.toBeUndefined();

    // Every up() must do at least one schema-building call — a table, a
    // type, or raw SQL (the trigger migration uses pgm.sql).
    const builtSomething =
      spies.createTable.mock.calls.length > 0 ||
      spies.createType.mock.calls.length > 0 ||
      spies.sql.mock.calls.length > 0;
    expect(builtSomething).toBe(true);
  });

  it.each([
    '001_create_chats.ts',
    '002_create_chat_participants.ts',
    '003_create_messages.ts',
    '004_install_messages_search_vector_trigger.ts',
    '005_create_message_reactions.ts',
    '006_create_message_reads.ts',
  ])('%s down() drives the builder to tear schema objects down', async filename => {
    const mod = (await import(`./${filename}`)) as {
      down: (pgm: MigrationBuilder) => Promise<void>;
    };
    const { pgm, spies } = makePgmMock();

    await expect(mod.down(pgm)).resolves.toBeUndefined();

    // Every down() must reverse something — drop a table/type or run raw
    // SQL (the trigger migration drops its trigger + function via sql).
    const tornDownSomething =
      spies.dropTable.mock.calls.length > 0 ||
      spies.dropType.mock.calls.length > 0 ||
      spies.sql.mock.calls.length > 0;
    expect(tornDownSomething).toBe(true);
  });
});
