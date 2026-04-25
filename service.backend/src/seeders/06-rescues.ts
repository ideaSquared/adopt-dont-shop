import Rescue from '../models/Rescue';

const rescueOrganizations = [
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Paws Rescue London',
    email: 'info@pawsrescue.dev',
    phone: '020 7946 0123',
    address: '1234 Victoria Street',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'GB',
    website: 'https://www.pawsrescue.dev',
    description:
      'Dedicated to rescuing, rehabilitating, and rehoming abandoned and abused animals in the Austin area.',
    mission: 'To provide safe haven for animals in need while finding them loving forever homes.',
    ein: '12-3456789',
    registrationNumber: 'TX-RESCUE-001',
    contactPerson: 'Rescue Manager',
    contactTitle: 'Executive Director',
    contactEmail: 'rescue.manager@pawsrescue.dev',
    contactPhone: '(512) 555-0123',
    status: 'verified' as const,
    verifiedAt: new Date('2023-01-15'),
    verifiedBy: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    settings: {
      autoApproveApplications: false,
      requireHomeVisit: true,
      allowPublicContact: true,
      adoptionFeeRange: { min: 50, max: 300 },
      adoptionPolicies: {
        requireHomeVisit: true,
        requireReferences: true,
        minimumReferenceCount: 2,
        requireVeterinarianReference: true,
        adoptionFeeRange: { min: 50, max: 300 },
        requirements: [
          'Must be 21 years or older',
          'Must have landlord approval if renting',
          'All family members must meet the pet',
          'Must have secure garden or outdoor space',
        ],
        policies: [
          'All pets are spayed/neutered before adoption',
          'Microchipping is mandatory',
          'Trial adoption period of 2 weeks available',
          '30-day return policy if adoption does not work out',
        ],
        returnPolicy:
          'If for any reason the adoption does not work out, we ask that you return the pet to us rather than rehoming them yourself. We offer a 30-day return policy with a full refund of the adoption fee.',
        spayNeuterPolicy:
          'All dogs and cats are spayed or neutered before adoption. In rare cases where a pet is too young or has health concerns, adopters must sign an agreement to complete the procedure at the appropriate time.',
        followUpPolicy:
          'We conduct follow-up visits at 2 weeks, 1 month, and 3 months after adoption to ensure the pet is settling in well. Our team is always available for support and advice.',
      },
    },
  },
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Happy Tails Senior Dog Rescue',
    email: 'info@happytailsrescue.dev',
    phone: '0121 496 0456',
    address: '5678 Broad Street',
    city: 'Birmingham',
    county: 'West Midlands',
    postcode: 'B1 1AD',
    country: 'GB',
    website: 'https://www.happytailsrescue.dev',
    description:
      'Specializing in senior dog rescue and care, ensuring older dogs find loving homes for their golden years.',
    mission:
      'To give senior dogs a second chance at happiness and help them live out their golden years with dignity and love.',
    ein: '98-7654321',
    registrationNumber: 'FL-RESCUE-002',
    contactPerson: 'Maria Garcia',
    contactTitle: 'Founder & Director',
    contactEmail: 'maria@happytailsrescue.dev',
    contactPhone: '(305) 555-0456',
    status: 'verified' as const,
    verifiedAt: new Date('2023-02-20'),
    verifiedBy: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    settings: {
      autoApproveApplications: false,
      requireHomeVisit: true,
      allowPublicContact: true,
      adoptionFeeRange: { min: 25, max: 150 },
      adoptionPolicies: {
        requireHomeVisit: true,
        requireReferences: true,
        minimumReferenceCount: 3,
        requireVeterinarianReference: true,
        adoptionFeeRange: { min: 25, max: 150 },
        requirements: [
          'Must be 25 years or older for senior dogs',
          'Must be home most of the day or have pet care arrangements',
          'Must have experience with senior or special needs dogs',
          'Must be financially stable to cover potential veterinary costs',
        ],
        policies: [
          'Reduced adoption fees for senior dogs',
          'All pets are health-checked and treated before adoption',
          'We provide ongoing medical support for senior pets',
          'Lifetime return policy - we will always take our dogs back',
        ],
        returnPolicy:
          'We offer a lifetime return policy. If at any point you are unable to care for your senior dog, we will take them back and provide them with the care they need. No questions asked.',
        spayNeuterPolicy:
          'All senior dogs are already spayed or neutered. Medical records are provided with each adoption.',
        followUpPolicy:
          'Given the special needs of senior dogs, we maintain regular contact with adopters. We check in monthly for the first year and are available 24/7 for emergency support or advice.',
      },
    },
  },
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Furry Friends Manchester',
    email: 'info@furryfriendspdx.dev',
    phone: '0161 496 0789',
    address: '9012 Market Street',
    city: 'Manchester',
    county: 'Greater Manchester',
    postcode: 'M1 1AB',
    country: 'GB',
    website: 'https://www.furryfriendspdx.dev',
    description:
      'Multi-species rescue focusing on cats, dogs, and small mammals in the Portland metropolitan area.',
    mission:
      'To rescue, rehabilitate, and rehome companion animals while promoting responsible pet ownership.',
    ein: '55-1234567',
    registrationNumber: 'OR-RESCUE-003',
    contactPerson: 'Portland Rescue Team',
    contactTitle: 'Rescue Coordinator',
    contactEmail: 'coordinator@furryfriendspdx.dev',
    contactPhone: '(503) 555-0789',
    status: 'pending' as const,
    settings: {
      autoApproveApplications: false,
      requireHomeVisit: false,
      allowPublicContact: true,
      adoptionFeeRange: { min: 75, max: 400 },
    },
  },
];

export async function seedRescues() {
  for (const rescueData of rescueOrganizations) {
    await Rescue.findOrCreate({
      paranoid: false,
      where: { email: rescueData.email },
      defaults: {
        ...rescueData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${rescueOrganizations.length} rescue organizations`);
}
