import Pet, {
  AgeGroup,
  EnergyLevel,
  Gender,
  PetStatus,
  PetType,
  Size,
  SpayNeuterStatus,
  VaccinationStatus,
} from '../models/Pet';

const petProfiles = [
  {
    pet_id: 'pet_buddy_001',
    name: 'Buddy',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    short_description: 'Friendly golden retriever looking for an active family',
    long_description:
      'Buddy is a wonderful 3-year-old golden retriever who loves playing fetch, going on hikes, and meeting new people. He is great with children and other dogs. Buddy is house trained and knows basic commands. He would make a perfect addition to an active family who can give him the exercise and attention he deserves.',
    age_years: 3,
    age_months: 2,
    age_group: AgeGroup.ADULT,
    gender: Gender.MALE,
    status: PetStatus.AVAILABLE,
    type: PetType.DOG,
    breed: 'Golden Retriever',
    weight_kg: 28.5,
    size: Size.LARGE,
    color: 'Golden',
    markings: 'White chest patch',
    microchip_id: 'MCP001234567',
    archived: false,
    featured: true,
    priority_listing: false,
    adoption_fee: 250,
    special_needs: false,
    house_trained: true,
    good_with_children: true,
    good_with_dogs: true,
    good_with_cats: false,
    good_with_small_animals: false,
    energy_level: EnergyLevel.HIGH,
    exercise_needs: 'Needs 2+ hours of exercise daily, loves hiking and swimming',
    grooming_needs: 'Weekly brushing, professional grooming every 6-8 weeks',
    training_notes: 'Knows sit, stay, come, down. Working on leash manners.',
    temperament: ['friendly', 'energetic', 'loyal', 'playful'],
    medical_notes: 'Up to date on all vaccinations, heartworm negative',
    behavioral_notes: 'Loves to play fetch, can be mouthy when excited',
    surrender_reason: "Owner moved to apartment that doesn't allow pets",
    intake_date: new Date('2024-01-15'),
    vaccination_status: VaccinationStatus.UP_TO_DATE,
    vaccination_date: new Date('2024-01-20'),
    spay_neuter_status: SpayNeuterStatus.NEUTERED,
    spay_neuter_date: new Date('2023-08-15'),
    last_vet_checkup: new Date('2024-01-20'),
    images: [
      {
        image_id: 'img_buddy_001',
        url: 'https://placedog.net/800/600?id=1',
        thumbnail_url: 'https://placedog.net/300/300?id=1',
        caption: 'Buddy playing in the yard',
        is_primary: true,
        order_index: 0,
        uploaded_at: new Date(),
      },
      {
        image_id: 'img_buddy_002',
        url: 'https://placedog.net/800/600?id=2',
        thumbnail_url: 'https://placedog.net/300/300?id=2',
        caption: 'Buddy running on the beach',
        is_primary: false,
        order_index: 1,
        uploaded_at: new Date(),
      },
    ],
    location: { type: 'Point', coordinates: [-97.7431, 30.2672] as [number, number] }, // Austin, TX
    available_since: new Date('2024-01-22'),
    view_count: 145,
    favorite_count: 23,
    application_count: 8,
    tags: ['dog-friendly', 'active', 'family-dog', 'outdoor-lover'],
  },
  {
    pet_id: 'pet_whiskers_001',
    name: 'Whiskers',
    rescue_id: '550e8400-e29b-41d4-a716-446655440003',
    short_description: 'Sweet senior cat looking for a quiet retirement home',
    long_description:
      'Whiskers is a gentle 12-year-old tabby cat who enjoys sunny windowsills, gentle pets, and quiet companionship. She is perfect for someone looking for a calm, loving companion. Whiskers is litter trained and gets along well with other calm cats. She would do best in a quiet home without young children.',
    age_years: 12,
    age_months: 3,
    age_group: AgeGroup.SENIOR,
    gender: Gender.FEMALE,
    status: PetStatus.AVAILABLE,
    type: PetType.CAT,
    breed: 'Domestic Shorthair',
    weight_kg: 4.2,
    size: Size.MEDIUM,
    color: 'Brown Tabby',
    markings: 'White paws and chest',
    microchip_id: 'MCP002345678',
    archived: false,
    featured: true,
    priority_listing: true,
    adoption_fee: 75,
    special_needs: true,
    special_needs_description: 'Senior cat with mild arthritis, needs daily medication',
    house_trained: true,
    good_with_children: false,
    good_with_dogs: false,
    good_with_cats: true,
    good_with_small_animals: null,
    energy_level: EnergyLevel.LOW,
    exercise_needs: 'Light play sessions, enjoys interactive toys',
    grooming_needs: 'Weekly brushing, occasional nail trims',
    training_notes: 'Litter trained, responds to name',
    temperament: ['calm', 'affectionate', 'quiet', 'gentle'],
    medical_notes: 'Mild arthritis, on joint supplements. Recent dental cleaning.',
    behavioral_notes: 'Prefers quiet environments, loves to be petted',
    surrender_reason: 'Owner went into assisted living',
    intake_date: new Date('2024-02-01'),
    vaccination_status: VaccinationStatus.UP_TO_DATE,
    vaccination_date: new Date('2024-02-05'),
    spay_neuter_status: SpayNeuterStatus.SPAYED,
    spay_neuter_date: new Date('2018-03-15'),
    last_vet_checkup: new Date('2024-02-05'),
    images: [
      {
        image_id: 'img_whiskers_001',
        url: 'https://cataas.com/cat/cute?width=800&height=600',
        thumbnail_url: 'https://cataas.com/cat/cute?width=300&height=300',
        caption: 'Whiskers enjoying a sunny spot',
        is_primary: true,
        order_index: 0,
        uploaded_at: new Date(),
      },
    ],
    location: { type: 'Point', coordinates: [-122.6587, 45.5152] as [number, number] }, // Portland, OR
    available_since: new Date('2024-02-10'),
    view_count: 67,
    favorite_count: 12,
    application_count: 4,
    tags: ['senior', 'quiet', 'lap-cat', 'special-needs'],
  },
  {
    pet_id: 'pet_rocky_001',
    name: 'Rocky',
    rescue_id: '550e8400-e29b-41d4-a716-446655440002',
    short_description: 'Senior pit bull mix with a heart of gold',
    long_description:
      'Rocky is a 9-year-old pit bull mix who is the definition of a gentle giant. Despite his tough appearance, he is incredibly sweet and loving. Rocky enjoys leisurely walks, car rides, and spending time with his human friends. He is looking for a patient family who understands that senior dogs make the most grateful companions.',
    age_years: 9,
    age_months: 7,
    age_group: AgeGroup.SENIOR,
    gender: Gender.MALE,
    status: PetStatus.AVAILABLE,
    type: PetType.DOG,
    breed: 'Pit Bull Mix',
    secondary_breed: 'American Staffordshire Terrier',
    weight_kg: 32.2,
    size: Size.LARGE,
    color: 'Brindle',
    markings: 'White chest and paws',
    microchip_id: 'MCP003456789',
    archived: false,
    featured: true,
    priority_listing: true,
    adoption_fee: 125,
    special_needs: false,
    house_trained: true,
    good_with_children: true,
    good_with_dogs: false,
    good_with_cats: false,
    good_with_small_animals: false,
    energy_level: EnergyLevel.MEDIUM,
    exercise_needs: 'Daily walks, enjoys gentle exercise',
    grooming_needs: 'Weekly brushing, occasional baths',
    training_notes: 'House trained, knows basic commands, walks well on leash',
    temperament: ['gentle', 'loyal', 'calm', 'affectionate'],
    medical_notes: 'Senior wellness exam complete, minor hip dysplasia',
    behavioral_notes: 'Prefers to be the only dog, loves people',
    surrender_reason: "Family had new baby and couldn't manage both",
    intake_date: new Date('2024-01-08'),
    vaccination_status: VaccinationStatus.UP_TO_DATE,
    vaccination_date: new Date('2024-01-10'),
    spay_neuter_status: SpayNeuterStatus.NEUTERED,
    spay_neuter_date: new Date('2020-05-15'),
    last_vet_checkup: new Date('2024-01-10'),
    images: [
      {
        image_id: 'img_rocky_001',
        url: 'https://placedog.net/800/600?id=3',
        thumbnail_url: 'https://placedog.net/300/300?id=3',
        caption: "Rocky's gentle smile",
        is_primary: true,
        order_index: 0,
        uploaded_at: new Date(),
      },
    ],
    location: { type: 'Point', coordinates: [-80.1918, 25.7617] as [number, number] }, // Miami, FL
    available_since: new Date('2024-01-15'),
    view_count: 89,
    favorite_count: 18,
    application_count: 6,
    tags: ['senior', 'gentle-giant', 'loyal', 'only-dog'],
  },
  {
    pet_id: 'pet_luna_001',
    name: 'Luna',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    short_description: 'Playful young cat with striking blue eyes',
    long_description:
      'Luna is a beautiful 2-year-old Siamese mix with stunning blue eyes and a playful personality. She loves interactive toys, climbing cat trees, and chatting with her humans. Luna is very social and would do well with another cat or in a home where she gets plenty of attention and stimulation.',
    age_years: 2,
    age_months: 1,
    age_group: AgeGroup.ADULT,
    gender: Gender.FEMALE,
    status: PetStatus.PENDING,
    type: PetType.CAT,
    breed: 'Siamese Mix',
    weight_kg: 3.8,
    size: Size.MEDIUM,
    color: 'Seal Point',
    markings: 'Dark face, ears, and tail with cream body',
    microchip_id: 'MCP004567890',
    archived: false,
    featured: true,
    priority_listing: false,
    adoption_fee: 150,
    special_needs: false,
    house_trained: true,
    good_with_children: true,
    good_with_dogs: null,
    good_with_cats: true,
    good_with_small_animals: false,
    energy_level: EnergyLevel.HIGH,
    exercise_needs: 'Loves to play, needs interactive toys and climbing opportunities',
    grooming_needs: 'Weekly brushing, nail trims as needed',
    training_notes: 'Litter trained, very vocal and communicative',
    temperament: ['playful', 'social', 'intelligent', 'vocal'],
    medical_notes: 'Healthy, up to date on vaccinations',
    behavioral_notes: 'Very social, needs mental stimulation',
    surrender_reason: 'Found as stray kitten, raised in foster care',
    intake_date: new Date('2023-08-20'),
    vaccination_status: VaccinationStatus.UP_TO_DATE,
    vaccination_date: new Date('2024-01-15'),
    spay_neuter_status: SpayNeuterStatus.SPAYED,
    spay_neuter_date: new Date('2023-11-10'),
    last_vet_checkup: new Date('2024-01-15'),
    images: [
      {
        image_id: 'img_luna_001',
        url: 'https://cataas.com/cat/siamese?width=800&height=600',
        thumbnail_url: 'https://cataas.com/cat/siamese?width=300&height=300',
        caption: 'Luna showing off her beautiful blue eyes',
        is_primary: true,
        order_index: 0,
        uploaded_at: new Date(),
      },
    ],
    location: { type: 'Point', coordinates: [-97.7431, 30.2672] as [number, number] }, // Austin, TX
    available_since: new Date('2023-12-01'),
    view_count: 234,
    favorite_count: 45,
    application_count: 12,
    tags: ['young', 'playful', 'social', 'beautiful'],
  },
  {
    pet_id: 'pet_max_001',
    name: 'Max',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    short_description: 'Energetic young shepherd mix needing training',
    long_description:
      'Max is a 1-year-old German Shepherd mix who is full of energy and potential. He is still learning his manners and would benefit from an experienced dog owner who can provide consistent training and socialization. Max is very smart and eager to please, he just needs someone to help him channel his energy in positive ways.',
    age_years: 1,
    age_months: 3,
    age_group: AgeGroup.YOUNG,
    gender: Gender.MALE,
    status: PetStatus.AVAILABLE,
    type: PetType.DOG,
    breed: 'German Shepherd Mix',
    weight_kg: 22.7,
    size: Size.LARGE,
    color: 'Black and Tan',
    markings: 'Traditional German Shepherd coloring',
    microchip_id: 'MCP005678901',
    archived: false,
    featured: true,
    priority_listing: false,
    adoption_fee: 200,
    special_needs: false,
    house_trained: false,
    good_with_children: null,
    good_with_dogs: true,
    good_with_cats: null,
    good_with_small_animals: null,
    energy_level: EnergyLevel.VERY_HIGH,
    exercise_needs: 'Needs extensive daily exercise and mental stimulation',
    grooming_needs: 'Weekly brushing, sheds seasonally',
    training_notes: 'Needs basic obedience training, very intelligent and food motivated',
    temperament: ['energetic', 'intelligent', 'loyal', 'protective'],
    medical_notes: 'Healthy young dog, up to date on puppy vaccinations',
    behavioral_notes: 'Needs training and socialization, can be mouthy',
    surrender_reason: 'Owner underestimated the energy and training needs',
    intake_date: new Date('2024-02-10'),
    vaccination_status: VaccinationStatus.PARTIAL,
    vaccination_date: new Date('2024-02-12'),
    spay_neuter_status: SpayNeuterStatus.NEUTERED,
    spay_neuter_date: new Date('2024-02-15'),
    last_vet_checkup: new Date('2024-02-12'),
    images: [
      {
        image_id: 'img_max_001',
        url: 'https://placedog.net/800/600?id=4',
        thumbnail_url: 'https://placedog.net/300/300?id=4',
        caption: 'Max ready for adventure',
        is_primary: true,
        order_index: 0,
        uploaded_at: new Date(),
      },
    ],
    location: { type: 'Point', coordinates: [-97.7431, 30.2672] as [number, number] }, // Austin, TX
    available_since: new Date('2024-02-20'),
    view_count: 98,
    favorite_count: 15,
    application_count: 5,
    tags: ['young', 'energetic', 'needs-training', 'smart'],
  },
];

export async function seedPets() {
  for (const petData of petProfiles) {
    await Pet.findOrCreate({
      where: { pet_id: petData.pet_id },
      defaults: {
        ...petData,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${petProfiles.length} pet profiles`);
}
