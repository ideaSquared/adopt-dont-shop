// src/models/index.ts
import Application from './Application'
import { AuditLog } from './AuditLog'
import Conversation from './Conversation'
import { FeatureFlag } from './FeatureFlag'
import Invitation from './Invitation'
import Message from './Message'
import Participant from './Participant'
import Permission from './Permission'
import Pet from './Pet'
import Rating from './Rating'
import Rescue, { RescueCreationAttributes } from './Rescue'
import Role from './Role'
import RolePermission from './RolePermission'
import StaffMember from './StaffMember'
import User, { UserCreationAttributes } from './User'
import UserPreference from './UserPreference'
import UserRole from './UserRole'

// Associations
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'user_id',
  as: 'Roles',
})
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'role_id',
  as: 'Users',
})

Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'role_id',
  as: 'Permissions',
})
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permission_id',
  as: 'Roles',
})

// Conversation Associations
Conversation.belongsTo(User, { foreignKey: 'started_by', as: 'starter' })
Conversation.belongsTo(Pet, { foreignKey: 'pet_id' })
Conversation.hasMany(Message, { foreignKey: 'conversation_id' }) // If needed to access messages via Conversation
Conversation.hasMany(Participant, {
  as: 'participants',
  foreignKey: 'conversation_id',
  sourceKey: 'conversation_id',
})

// Participant Associations
Participant.belongsTo(User, { foreignKey: 'user_id' })
Participant.belongsTo(Conversation, { foreignKey: 'conversation_id' })
Participant.belongsTo(Rescue, { foreignKey: 'rescue_id' })

// Message Associations
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' })
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'User' })

Pet.belongsTo(Rescue, { foreignKey: 'owner_id' })

Rating.belongsTo(User, { foreignKey: 'user_id' })
Rating.belongsTo(Pet, { foreignKey: 'pet_id' })

StaffMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
StaffMember.belongsTo(Rescue, { foreignKey: 'rescue_id' })

Rescue.hasMany(StaffMember, {
  foreignKey: 'rescue_id',
  as: 'staff',
})

UserPreference.belongsTo(User, { foreignKey: 'user_id' })

// Rescue has many Invitations
Rescue.hasMany(Invitation, { as: 'invitations', foreignKey: 'rescue_id' })
Invitation.belongsTo(Rescue, { as: 'rescue', foreignKey: 'rescue_id' })

// User can be invited multiple times (optional, based on your requirements)
// User.hasMany(Invitation, {
//   as: 'invitations',
//   foreignKey: 'email',
//   sourceKey: 'email',
// })
// Invitation.belongsTo(User, {
//   as: 'user',
//   foreignKey: 'email',
//   targetKey: 'email',
// })

User.hasMany(Invitation, { foreignKey: 'user_id' })
Invitation.belongsTo(User, { foreignKey: 'user_id' })

export {
  Application,
  AuditLog,
  Conversation,
  FeatureFlag,
  Invitation,
  Message,
  Participant,
  Permission,
  Pet,
  Rating,
  Rescue,
  RescueCreationAttributes,
  Role,
  RolePermission,
  StaffMember,
  User,
  UserCreationAttributes,
  UserPreference,
  UserRole,
}
