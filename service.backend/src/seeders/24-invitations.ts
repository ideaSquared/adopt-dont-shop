import crypto from 'crypto';
import Invitation from '../models/Invitation';
import Rescue from '../models/Rescue';
import User from '../models/User';

export async function seedInvitations() {
  console.log('🔑 Seeding invitations...');

  try {
    // Get existing rescues and users
    const rescues = await Rescue.findAll({ limit: 3 });
    const users = await User.findAll({ limit: 5 });

    if (rescues.length === 0 || users.length === 0) {
      console.log('⚠️  Not enough rescues or users found. Skipping invitations seeding.');
      return;
    }

    // Clear existing invitations
    await Invitation.destroy({ where: {}, truncate: true });

    const invitations = [];

    // Pending invitation for first rescue
    if (rescues.length > 0 && users.length > 0) {
      invitations.push({
        email: 'volunteer@example.com',
        rescue_id: rescues[0].rescueId,
        token: crypto.randomBytes(32).toString('hex'),
        title: 'Volunteer Coordinator',
        invited_by: users[0].userId,
        expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        used: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Another pending invitation for second rescue
    if (rescues.length > 1 && users.length > 1) {
      invitations.push({
        email: 'foster.coordinator@example.com',
        rescue_id: rescues[1].rescueId,
        token: crypto.randomBytes(32).toString('hex'),
        title: 'Foster Coordinator',
        invited_by: users[1].userId,
        expiration: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        used: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Expired invitation (for testing)
    if (rescues.length > 0 && users.length > 0) {
      invitations.push({
        email: 'expired@example.com',
        rescue_id: rescues[0].rescueId,
        token: crypto.randomBytes(32).toString('hex'),
        title: 'Volunteer',
        invited_by: users[0].userId,
        expiration: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
        used: false,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      });
    }

    // Used invitation (for testing)
    if (rescues.length > 2 && users.length > 1) {
      invitations.push({
        email: 'completed@example.com',
        rescue_id: rescues[2].rescueId,
        token: crypto.randomBytes(32).toString('hex'),
        title: 'Event Coordinator',
        invited_by: users[0].userId,
        expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        used: true, // Already accepted
        user_id: users[1].userId, // The user who accepted it
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Updated 2 days ago
      });
    }

    if (invitations.length === 0) {
      console.log('⚠️  Not enough data to create invitations. Skipping invitations seeding.');
      return;
    }

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
