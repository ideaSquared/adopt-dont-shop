import { describe, expect, it, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import Address, { AddressOwnerType } from '../../models/Address';
import Rescue from '../../models/Rescue';
import User from '../../models/User';

/**
 * Plan 5.5.11 — addresses are a polymorphic typed table. The legacy
 * shape lived inline on User and Rescue. These tests lock in the
 * model invariants that matter to the schema (FK semantics, primary
 * uniqueness, ISO country format) — the migration of the inline
 * columns is a separate slice.
 */
describe('Address model', () => {
  let userId: string;
  let rescueId: string;

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    const user = await User.create({
      userId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1',
      email: 'address-test@example.local',
      password: 'long-enough-password-123',
      firstName: 'A',
      lastName: 'B',
      userType: 'adopter',
      status: 'active',
      emailVerified: true,
    } as never);
    userId = user.userId;

    const rescue = await Rescue.create({
      name: 'Address Test Rescue',
      email: 'rescue@test.local',
      address: '1 Lane',
      city: 'Town',
      postcode: 'AB1 2CD',
      country: 'GB',
      contactPerson: 'X',
      status: 'pending',
    } as never);
    rescueId = rescue.rescueId;
  });

  it('persists a user address with required fields', async () => {
    const address = await Address.create({
      owner_type: AddressOwnerType.USER,
      owner_id: userId,
      label: 'home',
      line_1: '10 Downing Street',
      city: 'London',
      postal_code: 'SW1A 2AA',
      country: 'GB',
      is_primary: true,
    });

    const reloaded = await Address.findByPk(address.address_id);
    expect(reloaded?.owner_type).toBe(AddressOwnerType.USER);
    expect(reloaded?.owner_id).toBe(userId);
    expect(reloaded?.line_1).toBe('10 Downing Street');
    expect(reloaded?.is_primary).toBe(true);
  });

  it('persists a rescue address scoped under the rescue owner_type', async () => {
    const address = await Address.create({
      owner_type: AddressOwnerType.RESCUE,
      owner_id: rescueId,
      label: 'head office',
      line_1: '42 Galaxy Way',
      city: 'Bristol',
      postal_code: 'BS1 4DJ',
      country: 'GB',
      is_primary: true,
    });

    const reloaded = await Address.findByPk(address.address_id);
    expect(reloaded?.owner_type).toBe(AddressOwnerType.RESCUE);
    expect(reloaded?.owner_id).toBe(rescueId);
  });

  it('rejects a malformed country code', async () => {
    await expect(
      Address.create({
        owner_type: AddressOwnerType.USER,
        owner_id: userId,
        line_1: '1 Place',
        city: 'Town',
        postal_code: 'AB1 2CD',
        // Lowercase / wrong length — fails the ISO 3166-1 alpha-2 check.
        country: 'gb',
      } as never)
    ).rejects.toThrow();
  });

  it('allows multiple non-primary addresses for the same owner', async () => {
    await Address.create({
      owner_type: AddressOwnerType.USER,
      owner_id: userId,
      line_1: '1 Place',
      city: 'Town',
      postal_code: 'AB1 2CD',
      country: 'GB',
      is_primary: false,
    });
    await Address.create({
      owner_type: AddressOwnerType.USER,
      owner_id: userId,
      line_1: '2 Place',
      city: 'Town',
      postal_code: 'AB1 2CE',
      country: 'GB',
      is_primary: false,
    });

    const all = await Address.findAll({
      where: { owner_type: AddressOwnerType.USER, owner_id: userId },
    });
    expect(all).toHaveLength(2);
  });

  it('enforces a single primary address per owner via the partial unique index', async () => {
    await Address.create({
      owner_type: AddressOwnerType.USER,
      owner_id: userId,
      line_1: '1 Place',
      city: 'Town',
      postal_code: 'AB1 2CD',
      country: 'GB',
      is_primary: true,
    });

    await expect(
      Address.create({
        owner_type: AddressOwnerType.USER,
        owner_id: userId,
        line_1: '2 Place',
        city: 'Town',
        postal_code: 'AB1 2CE',
        country: 'GB',
        is_primary: true,
      })
    ).rejects.toThrow();
  });
});
