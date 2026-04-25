import { describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import Rescue from '../../models/Rescue';
import User from '../../models/User';
import { runWithContext } from '../../utils/request-context';

const seedActor = async (id: string): Promise<void> => {
  await User.create({
    userId: id,
    email: `actor-${id}@test.local`,
    password: 'password-x',
    firstName: 'Actor',
    lastName: 'Tester',
    userType: 'admin',
    status: 'active',
    emailVerified: true,
  } as never);
};

/**
 * End-to-end check of the audit-column wiring:
 *   - context-aware created_by / updated_by stamping
 *   - Sequelize version: true optimistic locking
 *
 * Uses Rescue against the in-memory test DB — it's the simplest of the
 * audited models (no array / geometry columns that getArrayType / SQLite
 * would reject in tests).
 */
describe('audit columns + request context', () => {
  let rescueCounter = 0;

  const makeRescue = (overrides: Record<string, unknown> = {}) => {
    rescueCounter += 1;
    return Rescue.create({
      name: `Rescue ${rescueCounter}`,
      email: `rescue${rescueCounter}@test.local`,
      address: '1 Test Lane',
      city: 'Testville',
      postcode: 'AB1 2CD',
      country: 'GB',
      contactPerson: 'Test Person',
      status: 'pending',
      ...overrides,
    } as never);
  };

  it('stamps created_by from request context on insert', async () => {
    await sequelize.sync({ force: true });
    const actorId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1';
    await seedActor(actorId);

    const rescue = await runWithContext({ userId: actorId }, () => makeRescue());

    const reloaded = (await Rescue.findByPk(rescue.rescueId)) as unknown as {
      created_by: string;
      updated_by: string;
    };
    expect(reloaded.created_by).toBe(actorId);
    expect(reloaded.updated_by).toBe(actorId);
  });

  it('refreshes updated_by on save without touching created_by', async () => {
    await sequelize.sync({ force: true });
    const creatorId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa2';
    const editorId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbb2';
    await seedActor(creatorId);
    await seedActor(editorId);

    const rescue = await runWithContext({ userId: creatorId }, () => makeRescue());
    await runWithContext({ userId: editorId }, async () => {
      rescue.name = `${rescue.name} (renamed)`;
      await rescue.save();
    });

    const reloaded = (await Rescue.findByPk(rescue.rescueId)) as unknown as {
      created_by: string;
      updated_by: string;
    };
    expect(reloaded.created_by).toBe(creatorId);
    expect(reloaded.updated_by).toBe(editorId);
  });

  it('leaves created_by null when no context is active (e.g. seeders)', async () => {
    await sequelize.sync({ force: true });
    // No runWithContext wrapper -> getUserId() is undefined -> hook no-ops.
    const rescue = await makeRescue();
    const reloaded = (await Rescue.findByPk(rescue.rescueId)) as unknown as {
      created_by: string | null;
      updated_by: string | null;
    };
    expect(reloaded.created_by).toBeNull();
    expect(reloaded.updated_by).toBeNull();
  });

  it('Sequelize version: true blocks stale updates', async () => {
    await sequelize.sync({ force: true });
    const rescue = await makeRescue();

    // Two independent in-memory copies of the same row.
    const a = (await Rescue.findByPk(rescue.rescueId)) as Rescue;
    const b = (await Rescue.findByPk(rescue.rescueId)) as Rescue;

    // First write wins, bumps version 0 -> 1.
    a.name = 'A wrote first';
    await a.save();

    // Second write is stale (still has version 0) and should be rejected.
    b.name = 'B writes stale';
    await expect(b.save()).rejects.toThrow();
  });
});
