import Rescue from '../models/Rescue';

const rescueOrganizations = [
  {
    rescueId: 'rescue_pawsrescue_001',
    name: 'Paws Rescue Austin',
    email: 'info@pawsrescue.dev',
    phone: '(512) 555-0123',
    address: '1234 Animal Way',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    country: 'US',
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
    verifiedBy: 'user_admin_001',
    settings: {
      autoApproveApplications: false,
      requireHomeVisit: true,
      allowPublicContact: true,
      adoptionFeeRange: { min: 50, max: 300 },
    },
    isDeleted: false,
  },
  {
    rescueId: 'rescue_happytails_001',
    name: 'Happy Tails Senior Dog Rescue',
    email: 'info@happytailsrescue.dev',
    phone: '(305) 555-0456',
    address: '5678 Sunset Boulevard',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    country: 'US',
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
    verifiedBy: 'user_admin_001',
    settings: {
      autoApproveApplications: false,
      requireHomeVisit: true,
      allowPublicContact: true,
      adoptionFeeRange: { min: 25, max: 150 },
    },
    isDeleted: false,
  },
  {
    rescueId: 'rescue_furryfriendspdx_001',
    name: 'Furry Friends Portland',
    email: 'info@furryfriendspdx.dev',
    phone: '(503) 555-0789',
    address: '9012 Forest Grove Road',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    country: 'US',
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
    isDeleted: false,
  },
];

export async function seedRescues() {
  for (const rescueData of rescueOrganizations) {
    await Rescue.findOrCreate({
      where: { email: rescueData.email },
      defaults: {
        ...rescueData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log(`✅ Created ${rescueOrganizations.length} rescue organizations`);
}
