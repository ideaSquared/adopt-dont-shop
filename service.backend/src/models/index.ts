import Application from './Application';
import ApplicationQuestion from './ApplicationQuestion';
import Pet from './Pet';
import Rescue from './Rescue';
import User from './User';
import UserFavorite from './UserFavorite';

// Communication Models
import Chat from './Chat';
import ChatParticipant from './ChatParticipant';
import FileUpload from './FileUpload';
import Message from './Message';

// Notification Models
import DeviceToken from './DeviceToken';
import Notification from './Notification';

// Auth & Permissions Models
import Permission from './Permission';
import Role from './Role';
import RolePermission from './RolePermission';
import UserRole from './UserRole';

// Additional Models
import AuditLog from './AuditLog';
import FeatureFlag from './FeatureFlag';
import Invitation from './Invitation';
import Rating from './Rating';
import StaffMember from './StaffMember';

// Content Moderation Models
import ModeratorAction from './ModeratorAction';
import Report from './Report';

// Email Models
import EmailPreference from './EmailPreference';
import EmailQueue from './EmailQueue';
import EmailTemplate from './EmailTemplate';

// Swipe Interface Models
import { SwipeAction } from './SwipeAction';
import { SwipeSession } from './SwipeSession';

// Define all models
const models = {
  User,
  UserFavorite,
  Rescue,
  Pet,
  Application,
  ApplicationQuestion,
  Chat,
  ChatParticipant,
  Message,
  Notification,
  DeviceToken,
  Role,
  Permission,
  RolePermission,
  UserRole,
  AuditLog,
  Rating,
  StaffMember,
  FeatureFlag,
  Invitation,
  ModeratorAction,
  Report,
  EmailTemplate,
  EmailQueue,
  EmailPreference,
  SwipeSession,
  SwipeAction,
  FileUpload,
};

// Setup associations (done explicitly below instead of using associate methods)

// Core entity associations
User.hasMany(Application, { foreignKey: 'user_id', as: 'Applications' });
Application.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

Pet.hasMany(Application, { foreignKey: 'pet_id', as: 'Applications' });
Application.belongsTo(Pet, { foreignKey: 'pet_id', as: 'Pet' });

Rescue.hasMany(Application, { foreignKey: 'rescue_id', as: 'Applications' });
Application.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'Rescue' });

Rescue.hasMany(Pet, { foreignKey: 'rescue_id', as: 'Pets' });
Pet.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'Rescue' });

// Application Questions associations
Rescue.hasMany(ApplicationQuestion, { foreignKey: 'rescue_id', as: 'Questions' });
ApplicationQuestion.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'Rescue' });

// Chat and messaging associations
Chat.hasMany(ChatParticipant, { foreignKey: 'chat_id', as: 'Participants' });
ChatParticipant.belongsTo(Chat, { foreignKey: 'chat_id', as: 'Chat' });

User.hasMany(ChatParticipant, { foreignKey: 'participant_id', as: 'ChatMemberships' });
ChatParticipant.belongsTo(User, { foreignKey: 'participant_id', as: 'User' });

Chat.hasMany(Message, { foreignKey: 'chat_id', as: 'Messages' });
Message.belongsTo(Chat, { foreignKey: 'chat_id', as: 'Chat' });

User.hasMany(Message, { foreignKey: 'sender_id', as: 'SentMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'Sender' });

// Ensure Chat belongsTo Rescue with alias 'rescue'
Chat.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'rescue' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'user_id', as: 'Notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

User.hasMany(DeviceToken, { foreignKey: 'user_id', as: 'DeviceTokens' });
DeviceToken.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

// RBAC associations
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'Roles',
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'Users',
});

Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'Permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'Roles',
});

// Audit and tracking associations
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'AuditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

// Rating associations
User.hasMany(Rating, { foreignKey: 'reviewer_id', as: 'GivenRatings' });
Rating.belongsTo(User, { foreignKey: 'reviewer_id', as: 'Reviewer' });

User.hasMany(Rating, { foreignKey: 'reviewee_id', as: 'ReceivedRatings' });
Rating.belongsTo(User, { foreignKey: 'reviewee_id', as: 'Reviewee' });

Rescue.hasMany(Rating, { foreignKey: 'rescue_id', as: 'Ratings' });
Rating.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'Rescue' });

// Staff associations
Rescue.hasMany(StaffMember, { foreignKey: 'rescueId', as: 'staff' });
StaffMember.belongsTo(Rescue, { foreignKey: 'rescueId', as: 'rescue' });

User.hasMany(StaffMember, { foreignKey: 'userId', as: 'staffMemberships' });
StaffMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Content Moderation associations
User.hasMany(Report, { foreignKey: 'reporterId', as: 'SubmittedReports' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'Reporter' });

User.hasMany(Report, { foreignKey: 'reportedUserId', as: 'ReceivedReports' });
Report.belongsTo(User, { foreignKey: 'reportedUserId', as: 'ReportedUser' });

User.hasMany(Report, { foreignKey: 'assignedModerator', as: 'AssignedReports' });
Report.belongsTo(User, { foreignKey: 'assignedModerator', as: 'AssignedModerator' });

User.hasMany(ModeratorAction, { foreignKey: 'moderatorId', as: 'ModeratorActions' });
ModeratorAction.belongsTo(User, { foreignKey: 'moderatorId', as: 'Moderator' });

User.hasMany(ModeratorAction, { foreignKey: 'targetUserId', as: 'ReceivedActions' });
ModeratorAction.belongsTo(User, { foreignKey: 'targetUserId', as: 'TargetUser' });

Report.hasMany(ModeratorAction, { foreignKey: 'reportId', as: 'Actions' });
ModeratorAction.belongsTo(Report, { foreignKey: 'reportId', as: 'Report' });

// Email Service associations
User.hasMany(EmailTemplate, { foreignKey: 'createdBy', as: 'CreatedEmailTemplates' });
EmailTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });

User.hasMany(EmailTemplate, { foreignKey: 'lastModifiedBy', as: 'ModifiedEmailTemplates' });
EmailTemplate.belongsTo(User, { foreignKey: 'lastModifiedBy', as: 'LastModifier' });

EmailTemplate.belongsTo(EmailTemplate, { foreignKey: 'parentTemplateId', as: 'ParentTemplate' });
EmailTemplate.hasMany(EmailTemplate, { foreignKey: 'parentTemplateId', as: 'ChildTemplates' });

EmailTemplate.hasMany(EmailQueue, { foreignKey: 'templateId', as: 'EmailQueue' });
EmailQueue.belongsTo(EmailTemplate, { foreignKey: 'templateId', as: 'Template' });

User.hasMany(EmailQueue, { foreignKey: 'userId', as: 'EmailQueue' });
EmailQueue.belongsTo(User, { foreignKey: 'userId', as: 'User' });

User.hasMany(EmailQueue, { foreignKey: 'createdBy', as: 'CreatedEmails' });
EmailQueue.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });

// Swipe Interface associations
User.hasMany(SwipeSession, { foreignKey: 'userId', as: 'SwipeSessions' });
SwipeSession.belongsTo(User, { foreignKey: 'userId', as: 'User' });

SwipeSession.hasMany(SwipeAction, { foreignKey: 'sessionId', as: 'SwipeActions' });
SwipeAction.belongsTo(SwipeSession, { foreignKey: 'sessionId', as: 'Session' });

User.hasMany(SwipeAction, { foreignKey: 'userId', as: 'SwipeActions' });
SwipeAction.belongsTo(User, { foreignKey: 'userId', as: 'User' });

Pet.hasMany(SwipeAction, { foreignKey: 'petId', as: 'SwipeActions' });
SwipeAction.belongsTo(Pet, { foreignKey: 'petId', as: 'Pet' });

User.hasOne(EmailPreference, { foreignKey: 'userId', as: 'EmailPreferences' });
EmailPreference.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// UserFavorite associations
User.hasMany(UserFavorite, { foreignKey: 'user_id', as: 'Favorites' });
UserFavorite.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

Pet.hasMany(UserFavorite, { foreignKey: 'pet_id', as: 'Favorites' });
UserFavorite.belongsTo(Pet, { foreignKey: 'pet_id', as: 'Pet' });

// FileUpload associations
User.hasMany(FileUpload, { foreignKey: 'uploaded_by', as: 'UploadedFiles' });
FileUpload.belongsTo(User, { foreignKey: 'uploaded_by', as: 'Uploader' });

// Export all models
export {
  Application,
  ApplicationQuestion,
  AuditLog,
  Chat,
  ChatParticipant,
  DeviceToken,
  EmailPreference,
  EmailQueue,
  EmailTemplate,
  FeatureFlag,
  FileUpload,
  Invitation,
  Message,
  ModeratorAction,
  Notification,
  Permission,
  Pet,
  Rating,
  Report,
  Rescue,
  Role,
  RolePermission,
  StaffMember,
  SwipeAction,
  SwipeSession,
  User,
  UserFavorite,
  UserRole,
};

export default models;
