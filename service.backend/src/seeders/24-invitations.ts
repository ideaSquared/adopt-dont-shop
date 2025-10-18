import crypto from 'crypto';
import Invitation from '../models/Invitation';

const invitations = [
  // Pending invitation for Paws Rescue Austin
  {
    email: 'volunteer@example.com',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001', // Paws Rescue Austin
    token: crypto.randomBytes(32).toString('hex'),
    title: 'Volunteer Coordinator',
    invited_by: 'user_rescue_admin_001',
    expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    used: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  // Another pending invitation for Happy Tails Senior Dog Rescue
  {
    email: 'foster.coordinator@example.com',
    rescue_id: '550e8400-e29b-41d4-a716-446655440002', // Happy Tails Senior Dog Rescue
    token: crypto.randomBytes(32).toString('hex'),
    title: 'Foster Coordinator',
    invited_by: 'user_rescue_admin_002',
    expiration: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    used: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  // Expired invitation (for testing)
  {
    email: 'expired@example.com',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    token: crypto.randomBytes(32).toString('hex'),
    title: 'Volunteer',
    invited_by: 'user_rescue_admin_001',
    expiration: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
    used: false,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  // Used invitation (for testing)
  {
    email: 'completed@example.com',
    rescue_id: '550e8400-e29b-41d4-a716-446655440003', // Furry Friends Portland
    token: crypto.randomBytes(32).toString('hex'),
    title: 'Event Coordinator',
    invited_by: 'user_admin_001',
    expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    used: true, // Already accepted
    user_id: 'user_moderator_001', // The user who accepted it
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Updated 2 days ago
  },
];

export async function seedInvitations() {
  console.log('🔑 Seeding invitations...');

  try {
    // Clear existing invitations
    await Invitation.destroy({ where: {}, truncate: true });

    // Create invitations
    await Invitation.bulkCreate(invitations);

    const count = await Invitation.count();
    console.log(`✅ Successfully seeded ${count} invitations`);
  } catch (error) {
    console.error('❌ Error seeding invitations:', error);
    throw error;
  }
}

export default seedInvitations;
