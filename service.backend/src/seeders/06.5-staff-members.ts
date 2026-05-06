import StaffMember from '../models/StaffMember';

const staffMembers = [
  // Paws Rescue Austin staff
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440001', // Paws Rescue Austin
    userId: '3d7065c5-82a3-4bba-a84e-78229365badd', // Rescue Manager
    title: 'Executive Director',
    isVerified: true,
    verifiedBy: '0e394fc1-c11a-4148-a2c7-5dfc51798d8d',
    verifiedAt: new Date('2023-01-15'),
    addedBy: '0e394fc1-c11a-4148-a2c7-5dfc51798d8d',
    addedAt: new Date('2023-01-15'),
  },
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440001', // Paws Rescue Austin
    userId: '378118eb-9e97-4940-adeb-0a53b252b057', // Sarah Johnson
    title: 'Veterinary Technician',
    isVerified: true,
    verifiedBy: '3d7065c5-82a3-4bba-a84e-78229365badd',
    verifiedAt: new Date('2023-01-20'),
    addedBy: '3d7065c5-82a3-4bba-a84e-78229365badd',
    addedAt: new Date('2023-01-20'),
  },
  // Happy Tails Senior Dog Rescue staff
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440002', // Happy Tails Senior Dog Rescue
    userId: 'c283bd85-11ce-4494-add0-b06896d38e2d', // Maria Garcia
    title: 'Founder & Director',
    isVerified: true,
    verifiedBy: '0e394fc1-c11a-4148-a2c7-5dfc51798d8d',
    verifiedAt: new Date('2023-02-20'),
    addedBy: '0e394fc1-c11a-4148-a2c7-5dfc51798d8d',
    addedAt: new Date('2023-02-20'),
  },
  // Furry Friends Manchester — verified so the rescue actually has at
  // least one staff member who can be tagged as `senderRole: rescue_staff`
  // by the chat layer. Without verification, every Furry Friends chat
  // looked like an unaffiliated user replying.
  {
    rescueId: '550e8400-e29b-41d4-a716-446655440003', // Furry Friends Manchester
    userId: '7599debb-3d71-497c-a6e9-a2aa255d77df', // Content Moderator (acting as rescue coordinator)
    title: 'Rescue Coordinator',
    isVerified: true,
    verifiedBy: '0e394fc1-c11a-4148-a2c7-5dfc51798d8d',
    verifiedAt: new Date('2024-01-15'),
    addedBy: '0e394fc1-c11a-4148-a2c7-5dfc51798d8d',
    addedAt: new Date('2024-01-10'),
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
