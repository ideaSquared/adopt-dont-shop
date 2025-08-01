import Role from '../models/Role';

const roles = [
  {
    name: 'super_admin',
    description: 'Super administrator with full system access',
  },
  {
    name: 'admin',
    description: 'Administrator with most system permissions',
  },
  {
    name: 'moderator',
    description: 'Content moderator with moderation permissions',
  },
  {
    name: 'rescue_admin',
    description: 'Rescue organization administrator',
  },
  {
    name: 'rescue_staff',
    description: 'Rescue organization staff member',
  },
  {
    name: 'rescue_volunteer',
    description: 'Rescue organization volunteer',
  },
  {
    name: 'adopter',
    description: 'Pet adopter - regular user',
  },
  {
    name: 'verified_adopter',
    description: 'Verified pet adopter with additional privileges',
  },
];

export async function seedRoles() {
  for (const roleData of roles) {
    await Role.findOrCreate({
      where: { name: roleData.name },
      defaults: {
        name: roleData.name,
        description: roleData.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${roles.length} roles`);
}
