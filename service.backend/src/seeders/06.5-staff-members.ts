import StaffMember from '../models/StaffMember';

const staffMembers = [
  // Paws Rescue Austin staff
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440001', // Paws Rescue Austin
    userId: 'user_rescue_admin_001', // Rescue Manager
    title: 'Executive Director',
    isVerified: true,
    verifiedBy: 'user_admin_001',
    verifiedAt: new Date('2023-01-15'),
    addedBy: 'user_admin_001',
    addedAt: new Date('2023-01-15'),
    isDeleted: false,
  },
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440001', // Paws Rescue Austin
    userId: 'user_rescue_staff_001', // Sarah Johnson
    title: 'Veterinary Technician',
    isVerified: false,
    verifiedBy: 'user_rescue_admin_001',
    verifiedAt: new Date('2023-01-20'),
    addedBy: 'user_rescue_admin_001',
    addedAt: new Date('2023-01-20'),
    isDeleted: false,
  },
  // Happy Tails Senior Dog Rescue staff
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440002', // Happy Tails Senior Dog Rescue
    userId: 'user_rescue_admin_002', // Maria Garcia
    title: 'Founder & Director',
    isVerified: true,
    verifiedBy: 'user_admin_001',
    verifiedAt: new Date('2023-02-20'),
    addedBy: 'user_admin_001',
    addedAt: new Date('2023-02-20'),
    isDeleted: false,
  },
  // Furry Friends Portland - let's add a staff member for the third rescue too
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440003', // Furry Friends Portland
    userId: 'user_moderator_001', // Content Moderator (can act as rescue coordinator)
    title: 'Rescue Coordinator',
    isVerified: false, // This one is pending verification
    verifiedBy: undefined,
    verifiedAt: undefined,
    addedBy: 'user_admin_001',
    addedAt: new Date('2024-01-10'),
    isDeleted: false,
  },
];

export const seedStaffMembers = async (): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log('🧑‍💼 Seeding staff members...');

  try {
    // Clear existing staff members
    await StaffMember.destroy({ where: {}, force: true });

    // Create staff members
    await StaffMember.bulkCreate(staffMembers);

    // eslint-disable-next-line no-console
    console.log(`✅ Successfully seeded ${staffMembers.length} staff members`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error seeding staff members:', error);
    throw error;
  }
};

export const clearStaffMembers = async (): Promise<void> => {
  try {
    await StaffMember.destroy({ where: {}, force: true });
    // eslint-disable-next-line no-console
    console.log('🗑️ Staff members cleared');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error clearing staff members:', error);
    throw error;
  }
};
