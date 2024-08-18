// src/models/index.ts
import Conversation from './Conversation'
import Message from './Message'
import Participant from './Participant'
import Permission from './Permission'
import Pet from './Pet'
import Rating from './Rating'
import Rescue from './Rescue'
import Role from './Role'
import RolePermission from './RolePermission'
import StaffMember from './StaffMember'
import User from './User'
import UserPreference from './UserPreference'
import UserRole from './UserRole'

// Associations
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id' })
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id' })

Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'role_id',
})
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permission_id',
})

Conversation.belongsTo(User, { foreignKey: 'started_by', as: 'starter' })
Conversation.belongsTo(Pet, { foreignKey: 'pet_id' })
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' })
Message.belongsTo(User, { foreignKey: 'sender_id' })

Participant.belongsTo(User, { foreignKey: 'user_id' })
Participant.belongsTo(Conversation, { foreignKey: 'conversation_id' })
Participant.belongsTo(Rescue, { foreignKey: 'rescue_id' })

Pet.belongsTo(Rescue, { foreignKey: 'owner_id' })

Rating.belongsTo(User, { foreignKey: 'user_id' })
Rating.belongsTo(Pet, { foreignKey: 'pet_id' })

StaffMember.belongsTo(User, { foreignKey: 'user_id' })
StaffMember.belongsTo(Rescue, { foreignKey: 'rescue_id' })

UserPreference.belongsTo(User, { foreignKey: 'user_id' })

export {
  Conversation,
  Message,
  Participant,
  Permission,
  Pet,
  Rating,
  Rescue,
  Role,
  RolePermission,
  StaffMember,
  User,
  UserPreference,
  UserRole,
}
