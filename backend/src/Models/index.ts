import Application from './Application'
import ApplicationCoreQuestion from './ApplicationCoreQuestions'
import ApplicationRescueQuestionConfig from './ApplicationRescueQuestionConfig'
import { AuditLog } from './AuditLog'
import Chat from './Chat'
import ChatParticipant from './ChatParticipant'
import { FeatureFlag } from './FeatureFlag'
import Invitation from './Invitation'
import Message from './Message'
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

// User & Role Associations
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

// Role & Permission Associations
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

// Chat Associations
Chat.belongsTo(Application, { foreignKey: 'application_id' })
Chat.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'rescue' })
Chat.hasMany(Message, { foreignKey: 'chat_id' })
Chat.hasMany(ChatParticipant, {
  foreignKey: 'chat_id',
  as: 'participants',
})

// ChatParticipant Associations
ChatParticipant.belongsTo(User, {
  foreignKey: 'participant_id',
  as: 'participant',
})
ChatParticipant.belongsTo(Chat, { foreignKey: 'chat_id' })

// Message Associations
Message.belongsTo(Chat, { foreignKey: 'chat_id' })
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'User' })

// Pet & Rescue Associations
Pet.belongsTo(Rescue, { foreignKey: 'owner_id' })

// Rating Associations
Rating.belongsTo(User, { foreignKey: 'user_id' })
Rating.belongsTo(Pet, { foreignKey: 'pet_id' })

// StaffMember Associations
StaffMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
StaffMember.belongsTo(Rescue, { foreignKey: 'rescue_id' })

// Rescue Associations
Rescue.hasMany(StaffMember, { foreignKey: 'rescue_id', as: 'staff' })
Rescue.hasMany(Chat, { foreignKey: 'rescue_id', as: 'chats' })
Rescue.hasMany(Invitation, { foreignKey: 'rescue_id', as: 'invitations' })

// Invitation Associations
Invitation.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'rescue' })
Invitation.belongsTo(User, { foreignKey: 'user_id' })

// UserPreference Associations
UserPreference.belongsTo(User, { foreignKey: 'user_id' })

export {
  Application,
  ApplicationCoreQuestion,
  ApplicationRescueQuestionConfig,
  AuditLog,
  Chat,
  ChatParticipant,
  FeatureFlag,
  Invitation,
  Message,
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
