/**
 * Faker-generated adopter population.
 *
 * Adds N additional adopters on top of the canonical hand-authored users
 * (admins, moderator, rescue staff, John Smith, Emily Davis, etc.) so
 * the existing fixture cross-references via fixed UUIDs remain stable.
 *
 * Determinism: faker.seed is fixed in lib/faker-rng (override via FAKER_SEED).
 * Volume: DEMO_ADOPTER_COUNT env override, default 200 per the design doc.
 *
 * Emails use the non-routable @demo.test domain so they cannot collide
 * with canonical accounts on adoptdontshop.dev or with @e2e.test fixtures.
 */

import crypto from 'crypto';
import User, { UserStatus, UserType } from '../../models/User';
import { hashPassword } from '../../utils/password';
import { ukFaker } from '../lib/faker-rng';
import { bulkInsert } from '../lib/bulk-insert';

const DEFAULT_ADOPTER_COUNT = 200;

/**
 * ADS-536: per-seed-run random password for demo accounts. Honours
 * SEED_PASSWORD when set so deterministic local fixtures still work.
 */
const generateDemoPassword = (): string => {
  const override = process.env.SEED_PASSWORD;
  if (override !== undefined && override.length >= 8) {
    return override;
  }
  const random = crypto.randomBytes(12).toString('base64url').slice(0, 12);
  return `S!${random}9a`;
};

const targetCount = (): number => {
  const raw = process.env.DEMO_ADOPTER_COUNT;
  if (raw === undefined) {
    return DEFAULT_ADOPTER_COUNT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_ADOPTER_COUNT;
};

// Spread timestamps over the last 18 months so dashboards / "recent
// signups" panels show realistic distributions instead of a single spike.
const randomCreatedAt = (): Date => {
  const now = Date.now();
  const eighteenMonthsMs = 18 * 30 * 24 * 60 * 60 * 1000;
  return new Date(now - Math.floor(ukFaker.number.float({ min: 0, max: 1 }) * eighteenMonthsMs));
};

export async function seedDemoUsers(): Promise<void> {
  const count = targetCount();
  if (count === 0) {
    return;
  }

  const demoPassword = generateDemoPassword();
  const passwordHash = await hashPassword(demoPassword);

  const rows = Array.from({ length: count }, () => {
    const firstName = ukFaker.person.firstName();
    const lastName = ukFaker.person.lastName();
    const slug = ukFaker.string.alphanumeric({ length: 6, casing: 'lower' });
    const createdAt = randomCreatedAt();
    return {
      userId: ukFaker.string.uuid(),
      firstName,
      lastName,
      email: `${firstName}.${lastName}+${slug}@demo.test`.toLowerCase(),
      password: passwordHash,
      phoneNumber: ukFaker.phone.number({ style: 'national' }),
      userType: UserType.ADOPTER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      country: 'GB',
      city: ukFaker.location.city(),
      addressLine1: ukFaker.location.streetAddress(),
      postalCode: ukFaker.location.zipCode('?# #??'),
      timezone: 'Europe/London',
      language: 'en',
      bio: ukFaker.lorem.sentence({ min: 8, max: 18 }),
      dateOfBirth: ukFaker.date.birthdate({ min: 21, max: 70, mode: 'age' }),
      termsAcceptedAt: createdAt,
      privacyPolicyAcceptedAt: createdAt,
      loginAttempts: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });

  await bulkInsert(User, rows);

  console.log(`✅ Inserted ${rows.length} faker-generated adopters (password: ${demoPassword})`);
}
