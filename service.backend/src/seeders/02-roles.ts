import Role from '../models/Role';

const roles = [
  {
    role_name: 'super_admin',
    description: 'Super administrator with full system access',
  },
  {
    role_name: 'admin',
    description: 'Administrator with most system permissions',
  },
  {
    role_name: 'moderator',
    description: 'Content moderator with moderation permissions',
  },
  {
    role_name: 'rescue_admin',
    description: 'Rescue organization administrator',
  },
  {
    role_name: 'rescue_staff',
    description: 'Rescue organization staff member',
  },
  {
    role_name: 'rescue_volunteer',
    description: 'Rescue organization volunteer',
  },
  {
    role_name: 'adopter',
    description: 'Pet adopter - regular user',
  },
  {
    role_name: 'verified_adopter',
    description: 'Verified pet adopter with additional privileges',
  },
];

export async function seedRoles() {
  for (const roleData of roles) {
    await Role.findOrCreate({
      where: { role_name: roleData.role_name },
      defaults: {
        role_name: roleData.role_name,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  console.log(`✅ Created ${roles.length} roles`);
}
