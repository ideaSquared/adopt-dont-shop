import Pet, {
  AgeGroup,
  EnergyLevel,
  Gender,
  PetStatus,
  PetType,
  Size,
  SpayNeuterStatus,
  VaccinationStatus,
} from '../../models/Pet';
import Rescue from '../../models/Rescue';
import { ukFaker } from '../lib/faker-rng';
import { bulkInsert } from '../lib/bulk-insert';

const DEFAULT_PET_COUNT = 800;

// Skewed status distribution — most pets are AVAILABLE, fewer are PENDING /
// ADOPTED / FOSTER. Reflects what dashboards actually look like.
const STATUS_BAG: PetStatus[] = (() => {
  const bag: PetStatus[] = [];
  for (let i = 0; i < 60; i++) {
    bag.push(PetStatus.AVAILABLE);
  }
  for (let i = 0; i < 15; i++) {
    bag.push(PetStatus.PENDING);
  }
  for (let i = 0; i < 15; i++) {
    bag.push(PetStatus.ADOPTED);
  }
  for (let i = 0; i < 5; i++) {
    bag.push(PetStatus.FOSTER);
  }
  for (let i = 0; i < 3; i++) {
    bag.push(PetStatus.MEDICAL_HOLD);
  }
  for (let i = 0; i < 2; i++) {
    bag.push(PetStatus.NOT_AVAILABLE);
  }
  return bag;
})();

const TYPE_BAG: PetType[] = (() => {
  const bag: PetType[] = [];
  for (let i = 0; i < 50; i++) {
    bag.push(PetType.DOG);
  }
  for (let i = 0; i < 35; i++) {
    bag.push(PetType.CAT);
  }
  for (let i = 0; i < 8; i++) {
    bag.push(PetType.RABBIT);
  }
  for (let i = 0; i < 3; i++) {
    bag.push(PetType.SMALL_MAMMAL);
  }
  for (let i = 0; i < 2; i++) {
    bag.push(PetType.BIRD);
  }
  for (let i = 0; i < 2; i++) {
    bag.push(PetType.OTHER);
  }
  return bag;
})();

const sizeForType = (type: PetType): Size => {
  switch (type) {
    case PetType.DOG:
      return ukFaker.helpers.arrayElement([Size.SMALL, Size.MEDIUM, Size.LARGE, Size.EXTRA_LARGE]);
    case PetType.CAT:
      return ukFaker.helpers.arrayElement([Size.SMALL, Size.MEDIUM]);
    case PetType.RABBIT:
    case PetType.SMALL_MAMMAL:
      return ukFaker.helpers.arrayElement([Size.EXTRA_SMALL, Size.SMALL]);
    default:
      return Size.SMALL;
  }
};

const targetCount = (): number => {
  const raw = process.env.DEMO_PET_COUNT;
  if (raw === undefined) {
    return DEFAULT_PET_COUNT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_PET_COUNT;
};

export async function seedDemoPets(): Promise<void> {
  const target = targetCount();
  if (target === 0) {
    return;
  }

  const rescues = await Rescue.findAll({ paranoid: false, attributes: ['rescueId'] });
  if (rescues.length === 0) {
    console.log('⚠️  No rescues to attach pets to — skipping demo pets');
    return;
  }

  const existing = await Pet.count({ paranoid: false });
  const toCreate = Math.max(0, target - existing);
  if (toCreate === 0) {
    return;
  }

  const rows = Array.from({ length: toCreate }, () => {
    const type = ukFaker.helpers.arrayElement(TYPE_BAG);
    const status = ukFaker.helpers.arrayElement(STATUS_BAG);
    const ageYears = ukFaker.number.int({ min: 0, max: 14 });
    const ageMonths = ageYears === 0 ? ukFaker.number.int({ min: 1, max: 11 }) : 0;
    const ageGroup =
      ageYears < 1
        ? AgeGroup.BABY
        : ageYears < 3
          ? AgeGroup.YOUNG
          : ageYears < 8
            ? AgeGroup.ADULT
            : AgeGroup.SENIOR;
    const intake = ukFaker.date.past({ years: 2 });
    const availableSince = ukFaker.date.between({ from: intake, to: new Date() });
    const isAdopted = status === PetStatus.ADOPTED;

    return {
      petId: ukFaker.string.uuid(),
      name: ukFaker.person.firstName(),
      rescueId: ukFaker.helpers.arrayElement(rescues).rescueId,
      shortDescription: ukFaker.lorem.sentence({ min: 6, max: 14 }),
      longDescription: ukFaker.lorem.paragraph({ min: 3, max: 6 }),
      ageYears,
      ageMonths,
      ageGroup,
      gender: ukFaker.helpers.arrayElement([Gender.MALE, Gender.FEMALE]),
      status,
      type,
      weightKg: Number(ukFaker.number.float({ min: 0.5, max: 50, fractionDigits: 1 })),
      size: sizeForType(type),
      color: ukFaker.color.human(),
      microchipId: `DEMO-${ukFaker.string.alphanumeric({ length: 12, casing: 'upper' })}`,
      archived: false,
      featured: ukFaker.datatype.boolean({ probability: 0.05 }),
      priorityListing: ukFaker.datatype.boolean({ probability: 0.1 }),
      adoptionFeeMinor: ukFaker.number.int({ min: 0, max: 30000 }),
      adoptionFeeCurrency: 'GBP',
      specialNeeds: ukFaker.datatype.boolean({ probability: 0.08 }),
      houseTrained: ukFaker.datatype.boolean({ probability: 0.7 }),
      goodWithChildren: ukFaker.datatype.boolean({ probability: 0.6 }),
      goodWithDogs: ukFaker.datatype.boolean({ probability: 0.6 }),
      goodWithCats: ukFaker.datatype.boolean({ probability: 0.4 }),
      goodWithSmallAnimals: ukFaker.datatype.boolean({ probability: 0.3 }),
      energyLevel: ukFaker.helpers.arrayElement([
        EnergyLevel.LOW,
        EnergyLevel.MEDIUM,
        EnergyLevel.HIGH,
      ]),
      temperament: ukFaker.helpers.arrayElements(
        ['friendly', 'shy', 'energetic', 'calm', 'playful', 'affectionate', 'independent'],
        { min: 1, max: 4 }
      ),
      intakeDate: intake,
      vaccinationStatus: VaccinationStatus.UP_TO_DATE,
      vaccinationDate: intake,
      spayNeuterStatus: ukFaker.helpers.arrayElement([
        SpayNeuterStatus.SPAYED,
        SpayNeuterStatus.NEUTERED,
        SpayNeuterStatus.NOT_ALTERED,
      ]),
      availableSince,
      adoptedDate: isAdopted
        ? ukFaker.date.between({ from: availableSince, to: new Date() })
        : null,
      viewCount: ukFaker.number.int({ min: 0, max: 500 }),
      favoriteCount: ukFaker.number.int({ min: 0, max: 50 }),
      applicationCount: ukFaker.number.int({ min: 0, max: 12 }),
      tags: ukFaker.helpers.arrayElements(
        ['needs-quiet-home', 'experienced-owner', 'first-time-ok', 'bonded-pair', 'medical-care'],
        { min: 0, max: 3 }
      ),
      createdAt: intake,
      updatedAt: availableSince,
    };
  });

  await bulkInsert(Pet, rows);

  console.log(`✅ Inserted ${rows.length} faker-generated pets (target ${target})`);
}
