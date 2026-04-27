import Application from './Application';
import ApplicationQuestion from './ApplicationQuestion';
import ApplicationStatusTransition from './ApplicationStatusTransition';
import ApplicationTimeline from './ApplicationTimeline';
import Pet from './Pet';
import PetMedia from './PetMedia';
import PetStatusTransition from './PetStatusTransition';
import Rescue from './Rescue';
import RescueSettings from './RescueSettings';
import User from './User';
import UserFavorite from './UserFavorite';
import UserApplicationPrefs from './UserApplicationPrefs';
import UserNotificationPrefs from './UserNotificationPrefs';
import UserPrivacyPrefs from './UserPrivacyPrefs';

// Communication Models
import Chat from './Chat';
import ChatParticipant from './ChatParticipant';
import FileUpload from './FileUpload';
import Message from './Message';
import MessageReaction from './MessageReaction';
import MessageRead from './MessageRead';

// Notification Models
import DeviceToken from './DeviceToken';
import Notification from './Notification';

// Auth & Permissions Models
import Permission from './Permission';
import RefreshToken from './RefreshToken';
import Role from './Role';
import RolePermission from './RolePermission';
import UserRole from './UserRole';

// Additional Models
import AuditLog from './AuditLog';
import IdempotencyKey from './IdempotencyKey';
import Invitation from './Invitation';
import Rating from './Rating';
import StaffMember from './StaffMember';

// Content Moderation Models
import ModeratorAction from './ModeratorAction';
import ModerationEvidence from './ModerationEvidence';
import Report from './Report';
import ReportStatusTransition from './ReportStatusTransition';
import UserSanction from './UserSanction';

// Support System Models
import SupportTicket from './SupportTicket';
import SupportTicketResponse from './SupportTicketResponse';

// Email Models
import EmailPreference from './EmailPreference';
import EmailQueue from './EmailQueue';
import EmailTemplate from './EmailTemplate';
import EmailTemplateVersion from './EmailTemplateVersion';

// Swipe Interface Models
import { SwipeAction } from './SwipeAction';
import { SwipeSession } from './SwipeSession';

// Application Management Models
import HomeVisit from './HomeVisit';
import HomeVisitStatusTransition from './HomeVisitStatusTransition';

// Field-Level Permissions
import FieldPermission from './FieldPermission';

// CMS Models
import Content from './Content';
import NavigationMenu from './NavigationMenu';

// Define all models
const models = {
  User,
  UserFavorite,
  UserNotificationPrefs,
  UserPrivacyPrefs,
  UserApplicationPrefs,
  Rescue,
  RescueSettings,
  Pet,
  PetMedia,
  PetStatusTransition,
  Application,
  ApplicationQuestion,
  ApplicationStatusTransition,
  ApplicationTimeline,
  Chat,
  ChatParticipant,
  Message,
  MessageReaction,
  MessageRead,
  Notification,
  DeviceToken,
  RefreshToken,
  Role,
  Permission,
  RolePermission,
  UserRole,
  AuditLog,
  IdempotencyKey,
  Rating,
  StaffMember,
  Invitation,
  ModeratorAction,
  ModerationEvidence,
  Report,
  ReportStatusTransition,
  UserSanction,
  SupportTicket,
  SupportTicketResponse,
  EmailTemplate,
  EmailTemplateVersion,
  EmailQueue,
  EmailPreference,
  SwipeSession,
  SwipeAction,
  FieldPermission,
  FileUpload,
  HomeVisit,
  HomeVisitStatusTransition,
  Content,
  NavigationMenu,
};

// Setup associations (done explicitly below instead of using associate methods)
// Wrapped in try-catch to handle cases where associations are set up multiple times (e.g., in tests with mocks)
try {
  // Core entity associations
  User.hasMany(Application, { foreignKey: 'user_id', as: 'UserApplications' });
  Application.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

  Pet.hasMany(Application, { foreignKey: 'pet_id', as: 'PetApplications' });
  Application.belongsTo(Pet, { foreignKey: 'pet_id', as: 'Pet' });

  // Application status-transition log (canonical history). The trigger
  // installed in ApplicationStatusTransition.ts denormalizes to_status
  // back onto applications.status — application code reads parent.status
  // as before, but the source of truth is the transitions table.
  Application.hasMany(ApplicationStatusTransition, {
    foreignKey: 'application_id',
    as: 'StatusTransitions',
  });
  ApplicationStatusTransition.belongsTo(Application, {
    foreignKey: 'application_id',
    as: 'Application',
  });
  User.hasMany(ApplicationStatusTransition, {
    foreignKey: 'transitioned_by',
    as: 'AppliedStatusTransitions',
  });
  ApplicationStatusTransition.belongsTo(User, {
    foreignKey: 'transitioned_by',
    as: 'TransitionedBy',
  });

  // Pet, HomeVisit, and Report status-transition logs follow the same
  // pattern as ApplicationStatusTransition (see above for the rationale).
  // The actor (transitioned_by) is declared without a DB-level FK
  // constraint (matching AuditLog.user) — it's forensic metadata that
  // outlives the user; lifecycle integrity is enforced by the parent FK.
  Pet.hasMany(PetStatusTransition, { foreignKey: 'pet_id', as: 'StatusTransitions' });
  PetStatusTransition.belongsTo(Pet, { foreignKey: 'pet_id', as: 'Pet' });
  User.hasMany(PetStatusTransition, {
    foreignKey: 'transitioned_by',
    as: 'AppliedPetStatusTransitions',
    constraints: false,
  });
  PetStatusTransition.belongsTo(User, {
    foreignKey: 'transitioned_by',
    as: 'TransitionedBy',
    constraints: false,
  });

  HomeVisit.hasMany(HomeVisitStatusTransition, {
    foreignKey: 'visit_id',
    as: 'StatusTransitions',
  });
  HomeVisitStatusTransition.belongsTo(HomeVisit, { foreignKey: 'visit_id', as: 'HomeVisit' });
  User.hasMany(HomeVisitStatusTransition, {
    foreignKey: 'transitioned_by',
    as: 'AppliedHomeVisitStatusTransitions',
    constraints: false,
  });
  HomeVisitStatusTransition.belongsTo(User, {
    foreignKey: 'transitioned_by',
    as: 'TransitionedBy',
    constraints: false,
  });

  Report.hasMany(ReportStatusTransition, { foreignKey: 'report_id', as: 'StatusTransitions' });
  ReportStatusTransition.belongsTo(Report, { foreignKey: 'report_id', as: 'Report' });
  User.hasMany(ReportStatusTransition, {
    foreignKey: 'transitioned_by',
    as: 'AppliedReportStatusTransitions',
    constraints: false,
  });
  ReportStatusTransition.belongsTo(User, {
    foreignKey: 'transitioned_by',
    as: 'TransitionedBy',
    constraints: false,
  });

  // Application Timeline associations
  Application.hasMany(ApplicationTimeline, {
    foreignKey: 'application_id',
    as: 'Timeline',
    constraints: false,
  });
  ApplicationTimeline.belongsTo(Application, {
    foreignKey: 'application_id',
    as: 'Application',
    constraints: false,
  });

  // Note: constraints: false allows timeline events to be created in tests without requiring user existence
  User.hasMany(ApplicationTimeline, {
    foreignKey: 'created_by',
    as: 'CreatedTimelineEvents',
    constraints: false,
  });
  ApplicationTimeline.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'CreatedBy',
    constraints: false,
  });

  // RescueSettings association (1:1, auto-created via Rescue.afterCreate
  // hook). Plan 5.6.
  Rescue.hasOne(RescueSettings, { foreignKey: 'rescue_id', as: 'Settings' });
  RescueSettings.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'Rescue' });

  Rescue.hasMany(Application, { foreignKey: 'rescue_id', as: 'RescueApplications' });
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

  // MessageReaction (plan 2.1) — typed table replacing Message.reactions
  // JSONB. CASCADE on the message FK so a deleted message takes its
  // reactions with it; CASCADE on the user FK matches existing chat
  // semantics (deleting a user removes their reactions).
  Message.hasMany(MessageReaction, { foreignKey: 'message_id', as: 'Reactions' });
  MessageReaction.belongsTo(Message, { foreignKey: 'message_id', as: 'Message' });
  User.hasMany(MessageReaction, { foreignKey: 'user_id', as: 'MessageReactions' });
  MessageReaction.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

  // MessageRead (plan 2.1) — typed table replacing Message.read_status
  // JSONB. CASCADE on the message FK so a deleted message takes its
  // read receipts with it; SET NULL on the user FK preserves the
  // forensic record if a user is removed.
  Message.hasMany(MessageRead, { foreignKey: 'message_id', as: 'Reads' });
  MessageRead.belongsTo(Message, { foreignKey: 'message_id', as: 'Message' });
  User.hasMany(MessageRead, {
    foreignKey: 'user_id',
    as: 'MessageReads',
    constraints: false,
  });
  MessageRead.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'User',
    constraints: false,
  });

  // Ensure Chat belongsTo Rescue with alias 'rescue'
  Chat.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'rescue' });

  // Notification associations
  User.hasMany(Notification, { foreignKey: 'user_id', as: 'Notifications' });
  Notification.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

  User.hasMany(DeviceToken, { foreignKey: 'user_id', as: 'DeviceTokens' });
  DeviceToken.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

  User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'RefreshTokens' });
  RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

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
  // Note: constraints: false allows audit logs to exist even if user is deleted (for historical auditing)
  User.hasMany(AuditLog, {
    foreignKey: 'user',
    sourceKey: 'userId',
    as: 'AuditLogs',
    constraints: false,
  });
  AuditLog.belongsTo(User, {
    foreignKey: 'user',
    targetKey: 'userId',
    as: 'userDetails',
    constraints: false,
  });

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

  // Invitation associations
  Rescue.hasMany(Invitation, { foreignKey: 'rescue_id', as: 'invitations' });
  Invitation.belongsTo(Rescue, { foreignKey: 'rescue_id', as: 'rescue' });

  User.hasMany(Invitation, { foreignKey: 'user_id', as: 'acceptedInvitations' });
  Invitation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

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

  // ModerationEvidence is polymorphic across Report and ModeratorAction
  // (plan 2.1). The FK column `parent_id` doesn't have a single
  // referenced table, so the Sequelize associations declare
  // `constraints: false` and `scope: { parent_type }` so each parent
  // sees only its own evidence rows.
  Report.hasMany(ModerationEvidence, {
    foreignKey: 'parent_id',
    as: 'Evidence',
    constraints: false,
    scope: { parent_type: 'report' },
  });
  ModerationEvidence.belongsTo(Report, {
    foreignKey: 'parent_id',
    as: 'Report',
    constraints: false,
  });
  ModeratorAction.hasMany(ModerationEvidence, {
    foreignKey: 'parent_id',
    as: 'Evidence',
    constraints: false,
    scope: { parent_type: 'moderator_action' },
  });
  ModerationEvidence.belongsTo(ModeratorAction, {
    foreignKey: 'parent_id',
    as: 'ModeratorAction',
    constraints: false,
  });

  // UserSanction associations
  User.hasMany(UserSanction, { foreignKey: 'userId', as: 'ReceivedSanctions' });
  UserSanction.belongsTo(User, { foreignKey: 'userId', as: 'User' });

  User.hasMany(UserSanction, { foreignKey: 'issuedBy', as: 'IssuedSanctions' });
  UserSanction.belongsTo(User, { foreignKey: 'issuedBy', as: 'Issuer' });

  Report.hasMany(UserSanction, { foreignKey: 'reportId', as: 'Sanctions' });
  UserSanction.belongsTo(Report, { foreignKey: 'reportId', as: 'Report' });

  ModeratorAction.hasMany(UserSanction, { foreignKey: 'moderatorActionId', as: 'Sanctions' });
  UserSanction.belongsTo(ModeratorAction, {
    foreignKey: 'moderatorActionId',
    as: 'ModeratorAction',
  });

  // SupportTicket associations
  User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'SupportTickets' });
  SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'User' });

  User.hasMany(SupportTicket, { foreignKey: 'assignedTo', as: 'AssignedTickets' });
  SupportTicket.belongsTo(User, { foreignKey: 'assignedTo', as: 'AssignedAgent' });

  // SupportTicketResponse associations
  SupportTicket.hasMany(SupportTicketResponse, { foreignKey: 'ticketId', as: 'Responses' });
  SupportTicketResponse.belongsTo(SupportTicket, { foreignKey: 'ticketId', as: 'Ticket' });

  User.hasMany(SupportTicketResponse, { foreignKey: 'responderId', as: 'TicketResponses' });
  SupportTicketResponse.belongsTo(User, { foreignKey: 'responderId', as: 'Responder' });

  // Email Service associations
  User.hasMany(EmailTemplate, { foreignKey: 'createdBy', as: 'CreatedEmailTemplates' });
  EmailTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });

  User.hasMany(EmailTemplate, { foreignKey: 'lastModifiedBy', as: 'ModifiedEmailTemplates' });
  EmailTemplate.belongsTo(User, { foreignKey: 'lastModifiedBy', as: 'LastModifier' });

  EmailTemplate.belongsTo(EmailTemplate, { foreignKey: 'parentTemplateId', as: 'ParentTemplate' });
  EmailTemplate.hasMany(EmailTemplate, { foreignKey: 'parentTemplateId', as: 'ChildTemplates' });

  // EmailTemplateVersion (plan 5.4) — typed table replacing
  // EmailTemplate.versions JSONB. CASCADE on the template FK so a
  // hard-deleted template takes its history with it; SET NULL on the
  // editor FK preserves the historical record if a user is removed.
  EmailTemplate.hasMany(EmailTemplateVersion, {
    foreignKey: 'template_id',
    as: 'Versions',
  });
  EmailTemplateVersion.belongsTo(EmailTemplate, {
    foreignKey: 'template_id',
    as: 'Template',
  });
  User.hasMany(EmailTemplateVersion, {
    foreignKey: 'created_by',
    as: 'AuthoredEmailTemplateVersions',
    constraints: false,
  });
  EmailTemplateVersion.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'Author',
    constraints: false,
  });

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

  // Pet media (plan 2.1 — Pet.images / Pet.videos JSONB extracted to a
  // typed table). Cascade so deleting a pet removes its media rows.
  Pet.hasMany(PetMedia, { foreignKey: 'pet_id', as: 'Media' });
  PetMedia.belongsTo(Pet, { foreignKey: 'pet_id', as: 'Pet' });

  User.hasOne(EmailPreference, { foreignKey: 'userId', as: 'EmailPreferences' });
  EmailPreference.belongsTo(User, { foreignKey: 'userId', as: 'User' });

  // UserNotificationPrefs association (1:1, auto-created via User.afterCreate
  // hook so consumers can always assume the row exists). Plan 5.6.
  User.hasOne(UserNotificationPrefs, { foreignKey: 'user_id', as: 'NotificationPrefs' });
  UserNotificationPrefs.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

  // UserPrivacyPrefs association (1:1, auto-created via User.afterCreate
  // hook). Plan 5.6.
  User.hasOne(UserPrivacyPrefs, { foreignKey: 'user_id', as: 'PrivacyPrefs' });
  UserPrivacyPrefs.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

  // UserApplicationPrefs association (1:1, auto-created via
  // User.afterCreate hook). Plan 5.6.
  User.hasOne(UserApplicationPrefs, { foreignKey: 'user_id', as: 'ApplicationPrefs' });
  UserApplicationPrefs.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

  // UserFavorite associations
  User.hasMany(UserFavorite, { foreignKey: 'user_id', as: 'Favorites' });
  UserFavorite.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

  Pet.hasMany(UserFavorite, { foreignKey: 'pet_id', as: 'Favorites' });
  UserFavorite.belongsTo(Pet, { foreignKey: 'pet_id', as: 'Pet' });

  // FileUpload associations

  // HomeVisit associations
  Application.hasMany(HomeVisit, { foreignKey: 'application_id', as: 'HomeVisits' });
  HomeVisit.belongsTo(Application, { foreignKey: 'application_id', as: 'Application' });
  User.hasMany(FileUpload, { foreignKey: 'uploaded_by', as: 'UploadedFiles' });
  FileUpload.belongsTo(User, { foreignKey: 'uploaded_by', as: 'Uploader' });

  // CMS associations
  User.hasMany(Content, { foreignKey: 'author_id', as: 'AuthoredContent' });
  Content.belongsTo(User, { foreignKey: 'author_id', as: 'Author' });

  User.hasMany(NavigationMenu, { foreignKey: 'created_by', as: 'CreatedMenus' });
  NavigationMenu.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
} catch (error) {
  // Silently ignore association errors in test environments where models may be loaded multiple times
  if (process.env.NODE_ENV !== 'test') {
    throw error;
  }
}

// Export all models
export {
  Application,
  ApplicationQuestion,
  ApplicationStatusTransition,
  ApplicationTimeline,
  AuditLog,
  Chat,
  ChatParticipant,
  IdempotencyKey,
  DeviceToken,
  RefreshToken,
  EmailPreference,
  EmailQueue,
  EmailTemplate,
  FieldPermission,
  FileUpload,
  HomeVisit,
  HomeVisitStatusTransition,
  Invitation,
  Message,
  MessageReaction,
  MessageRead,
  ModeratorAction,
  ModerationEvidence,
  Notification,
  Permission,
  Pet,
  PetMedia,
  PetStatusTransition,
  Rating,
  Report,
  ReportStatusTransition,
  Rescue,
  RescueSettings,
  Role,
  RolePermission,
  StaffMember,
  SupportTicket,
  SupportTicketResponse,
  SwipeAction,
  SwipeSession,
  User,
  UserFavorite,
  UserNotificationPrefs,
  UserPrivacyPrefs,
  UserApplicationPrefs,
  UserRole,
  UserSanction,
  Content,
  NavigationMenu,
};

export default models;
