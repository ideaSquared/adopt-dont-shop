/**
 * Real-looking pet content for the dev seeders.
 *
 * The old spam seeder named pets with `faker.person.firstName()` (pets called
 * "John"), wrote `faker.lorem` bios, set no breed, and attached no photos — so
 * the catalogue read as obviously fake. These pools give the seeder a real
 * shelter-roster feel: actual pet names, real breeds per species (the same
 * list the breeds lookup is planted from, so `breed_id` joins line up), and
 * composed bios that sound like adoption listings.
 */

export type Species =
  | 'dog'
  | 'cat'
  | 'rabbit'
  | 'bird'
  | 'reptile'
  | 'small_mammal'
  | 'fish'
  | 'other';

export const SPECIES: readonly Species[] = [
  'dog',
  'cat',
  'rabbit',
  'bird',
  'reptile',
  'small_mammal',
  'fish',
  'other',
];

// Common UK shelter names — sampled per pet instead of faker people-names.
export const PET_NAMES: readonly string[] = [
  'Bella',
  'Max',
  'Luna',
  'Charlie',
  'Lucy',
  'Cooper',
  'Bailey',
  'Daisy',
  'Rocky',
  'Molly',
  'Buddy',
  'Poppy',
  'Milo',
  'Ruby',
  'Teddy',
  'Rosie',
  'Oscar',
  'Coco',
  'Alfie',
  'Bella',
  'Toby',
  'Willow',
  'Winston',
  'Nala',
  'Bertie',
  'Maggie',
  'Ollie',
  'Lola',
  'Hugo',
  'Millie',
  'Frankie',
  'Peggy',
  'Louie',
  'Betty',
  'Reggie',
  'Dolly',
  'Monty',
  'Ivy',
  'Barney',
  'Pip',
];

// Canonical breeds per species. The pets `breeds` lookup is seeded from this
// exact map, and the pet seeder assigns `breed_id` by referencing the same
// (species, name) pair — so the two never drift.
export const BREEDS_BY_SPECIES: Record<Species, readonly string[]> = {
  dog: [
    'Labrador Retriever',
    'Staffordshire Bull Terrier',
    'Cocker Spaniel',
    'Border Collie',
    'German Shepherd',
    'Jack Russell Terrier',
    'Greyhound',
    'Cavalier King Charles Spaniel',
    'Lurcher',
    'Crossbreed',
  ],
  cat: [
    'Domestic Shorthair',
    'Domestic Longhair',
    'Tabby',
    'Maine Coon',
    'Siamese',
    'British Shorthair',
    'Ragdoll',
    'Bengal',
  ],
  rabbit: ['Netherland Dwarf', 'Lop', 'Lionhead', 'Rex', 'Dutch', 'Crossbreed'],
  bird: ['Budgerigar', 'Cockatiel', 'Canary', 'Lovebird', 'African Grey'],
  reptile: ['Bearded Dragon', 'Leopard Gecko', 'Corn Snake', 'Tortoise'],
  small_mammal: ['Guinea Pig', 'Syrian Hamster', 'Ferret', 'Rat', 'Gerbil'],
  fish: ['Goldfish', 'Betta', 'Guppy', 'Tetra'],
  other: ['Unknown'],
};

const TRAITS: readonly string[] = [
  'affectionate',
  'playful',
  'gentle',
  'curious',
  'loyal',
  'cuddly',
  'energetic',
  'laid-back',
  'friendly',
  'cheeky',
  'sweet-natured',
  'calm',
];

const HOOKS: readonly string[] = [
  'is looking for a quiet home to settle into',
  'would love a family with a garden to explore',
  'gets along well with other animals',
  'is happiest curled up on the sofa',
  'is ready for walks and adventures',
  'needs a patient owner to build confidence',
  'has so much love to give',
  'would suit a home as the only pet',
];

/**
 * Compose a believable short + long description from a seeded faker. Given the
 * same faker state (fixed seed) the output is reproducible run to run.
 */
export const composeBio = (
  faker: { helpers: { arrayElement: <T>(arr: readonly T[]) => T } },
  name: string,
  species: Species
): { short: string; long: string } => {
  const t1 = faker.helpers.arrayElement(TRAITS);
  const t2 = faker.helpers.arrayElement(TRAITS);
  const hook = faker.helpers.arrayElement(HOOKS);
  const noun = species === 'other' ? 'companion' : species;
  const short = `${name} is a ${t1}, ${t2} ${noun} who ${hook}.`;
  const long =
    `${name} came into our care and is now looking for a forever home. ` +
    `A ${t1} ${noun}, ${name} ${hook}. ` +
    `Our team has ${name} fully health-checked, vaccinated and microchipped. ` +
    `If you think ${name} could be the one for you, get in touch to arrange a meet.`;
  return { short, long };
};

// Real, species-matched Flickr photos via LoremFlickr. The `lock` query makes
// each URL resolve to a STABLE image (so a pet keeps its photo across runs),
// and the species tag matches the animal. These are absolute https URLs, so
// the frontend's resolveFileUrl passes them through untouched and the browser
// loads them directly (no storage/CDN wiring needed for dev).
const FLICKR_TAG: Record<Species, string> = {
  dog: 'dog',
  cat: 'cat',
  rabbit: 'rabbit',
  bird: 'bird',
  reptile: 'reptile',
  small_mammal: 'hamster',
  fish: 'fish',
  other: 'pet',
};

export const photoUrl = (species: Species, lock: number): string =>
  `https://loremflickr.com/640/480/${FLICKR_TAG[species]}?lock=${lock}`;
