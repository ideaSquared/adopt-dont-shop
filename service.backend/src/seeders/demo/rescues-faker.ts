import Rescue from '../../models/Rescue';
import { ukFaker } from '../lib/faker-rng';
import { bulkInsert } from '../lib/bulk-insert';

const DEFAULT_TARGET_COUNT = 20;
const STATUS_DISTRIBUTION: Array<Rescue['status']> = [
  'verified',
  'verified',
  'verified',
  'verified',
  'verified',
  'verified',
  'verified',
  'verified',
  'pending',
  'pending',
  'suspended',
];

const targetCount = (): number => {
  const raw = process.env.DEMO_RESCUE_COUNT;
  if (raw === undefined) {
    return DEFAULT_TARGET_COUNT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_TARGET_COUNT;
};

export async function seedDemoRescues(): Promise<void> {
  const target = targetCount();
  const existing = await Rescue.count({ paranoid: false });
  const toCreate = Math.max(0, target - existing);
  if (toCreate === 0) {
    return;
  }

  const rows = Array.from({ length: toCreate }, () => {
    const city = ukFaker.location.city();
    const focus = ukFaker.helpers.arrayElement([
      'Cat',
      'Dog',
      'Senior Dog',
      'Bunny',
      'Small Animal',
      'Multi-Species',
    ]);
    const orgWord = ukFaker.helpers.arrayElement([
      'Rescue',
      'Sanctuary',
      'Haven',
      'Shelter',
      'Trust',
    ]);
    const slug = ukFaker.string.alphanumeric({ length: 5, casing: 'lower' });
    const name = `${city} ${focus} ${orgWord} ${slug}`;
    const status = ukFaker.helpers.arrayElement(STATUS_DISTRIBUTION);
    const verified = status === 'verified';
    const created = ukFaker.date.past({ years: 3 });
    return {
      rescueId: ukFaker.string.uuid(),
      name,
      email: `info+${slug}@${ukFaker.helpers.slugify(name).toLowerCase()}.demo.test`,
      phone: ukFaker.phone.number({ style: 'national' }),
      address: ukFaker.location.streetAddress(),
      city,
      county: ukFaker.location.county(),
      postcode: ukFaker.location.zipCode('?# #??'),
      country: 'GB',
      website: `https://${ukFaker.helpers.slugify(name).toLowerCase()}.demo.test`,
      description: ukFaker.lorem.paragraph(),
      mission: ukFaker.lorem.sentence({ min: 10, max: 20 }),
      contactPerson: `${ukFaker.person.firstName()} ${ukFaker.person.lastName()}`,
      contactTitle: ukFaker.helpers.arrayElement([
        'Director',
        'Coordinator',
        'Manager',
        'Founder',
        'Trustee',
      ]),
      contactEmail: `contact+${slug}@${ukFaker.helpers.slugify(name).toLowerCase()}.demo.test`,
      contactPhone: ukFaker.phone.number({ style: 'national' }),
      status,
      verifiedAt: verified ? ukFaker.date.between({ from: created, to: new Date() }) : undefined,
      verificationSource: verified
        ? ukFaker.helpers.arrayElement(['companies_house', 'charity_commission', 'manual'] as const)
        : undefined,
      settings: { adoptionPolicies: {} },
      createdAt: created,
      updatedAt: created,
    };
  });

  await bulkInsert(Rescue, rows);

  console.log(`✅ Inserted ${rows.length} faker-generated rescues (target ${target})`);
}
