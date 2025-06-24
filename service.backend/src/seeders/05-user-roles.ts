import Role from '../models/Role';
import User from '../models/User';
import UserRole from '../models/UserRole';

const userRoleAssignments = [
  { email: 'superadmin@adoptdontshop.dev', roles: ['super_admin'] },
  { email: 'admin@adoptdontshop.dev', roles: ['admin'] },
  { email: 'moderator@adoptdontshop.dev', roles: ['moderator'] },
  { email: 'rescue.manager@pawsrescue.dev', roles: ['rescue_admin'] },
  { email: 'sarah.johnson@pawsrescue.dev', roles: ['rescue_staff'] },
  { email: 'maria@happytailsrescue.dev', roles: ['rescue_admin'] },
  { email: 'john.smith@gmail.com', roles: ['adopter'] },
  { email: 'emily.davis@yahoo.com', roles: ['verified_adopter'] },
  { email: 'michael.brown@outlook.com', roles: ['verified_adopter'] },
  { email: 'jessica.wilson@gmail.com', roles: ['adopter'] },
];

export async function seedUserRoles() {
  let assignmentCount = 0;

  for (const assignment of userRoleAssignments) {
    const user = await User.findOne({ where: { email: assignment.email } });
    if (!user) {
      console.warn(`⚠️  User with email ${assignment.email} not found, skipping role assignments`);
      continue;
    }

    for (const roleName of assignment.roles) {
      const role = await Role.findOne({ where: { role_name: roleName } });
      if (!role) {
        console.warn(`⚠️  Role ${roleName} not found, skipping`);
        continue;
      }

      await UserRole.findOrCreate({
        where: {
          user_id: user.userId,
          role_id: role.role_id,
        },
        defaults: {
          user_id: user.userId,
          role_id: role.role_id,
        },
      });
      assignmentCount++;
    }
  }

  console.log(`✅ Created ${assignmentCount} user-role assignments`);
}
