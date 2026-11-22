import { describe, expect, it } from 'vitest';

import { findChangedShippedMigrations } from './check-migration-immutable.mjs';

describe('findChangedShippedMigrations', () => {
  it('flags a modified migration', () => {
    const diff = 'M\tservices/auth/src/migrations/001_create_users.ts';
    expect(findChangedShippedMigrations(diff)).toEqual([
      'services/auth/src/migrations/001_create_users.ts',
    ]);
  });

  it('flags a deleted migration', () => {
    const diff = 'D\tservices/pets/src/migrations/004_add_breeds.ts';
    expect(findChangedShippedMigrations(diff)).toEqual([
      'services/pets/src/migrations/004_add_breeds.ts',
    ]);
  });

  it('flags the old path of a renamed migration', () => {
    const diff =
      'R090\tservices/chat/src/migrations/002_a.ts\tservices/chat/src/migrations/002_b.ts';
    expect(findChangedShippedMigrations(diff)).toEqual(['services/chat/src/migrations/002_a.ts']);
  });

  it('allows a newly added migration', () => {
    const diff = 'A\tservices/auth/src/migrations/009_add_column.ts';
    expect(findChangedShippedMigrations(diff)).toEqual([]);
  });

  it('ignores changes to files that are not numbered migrations', () => {
    const diff = [
      'M\tservices/auth/src/migrations/helpers.ts',
      'M\tservices/auth/src/handlers.ts',
    ].join('\n');
    expect(findChangedShippedMigrations(diff)).toEqual([]);
  });
});
