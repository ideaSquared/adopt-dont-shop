import { describe, expect, it } from 'vitest';

import {
  ApplicationsV1,
  AuditV1,
  AuthV1,
  ChatV1,
  MatchingV1,
  ModerationV1,
  NotificationsV1,
  PetsV1,
  PingV1,
  RescueV1,
  type Application,
  type AuditEvent,
  type AuditQueryRequest,
  type Chat,
  type FileReportRequest,
  type RecordSwipeRequest,
  type Report,
  type SendMessageRequest,
  type StartSessionRequest,
  type SwipeSession,
  type AuthUser,
  type CreateNotificationRequest,
  type CreatePetRequest,
  type CreateRescueRequest,
  type EchoRequest,
  type EchoResponse,
  type LoginRequest,
  type Notification,
  type Pet,
  type StartDraftRequest,
  type Rescue,
  type ValidateTokenResponse,
} from './index.js';

describe('@adopt-dont-shop/proto', () => {
  describe('dual binding (CAD #7)', () => {
    it('exports the value namespace under PingV1 with the message factory', () => {
      expect(PingV1).toBeDefined();
      expect(PingV1.EchoRequest).toBeDefined();
      expect(typeof PingV1.EchoRequest.encode).toBe('function');
      expect(typeof PingV1.EchoRequest.decode).toBe('function');
    });

    it('exports the flat interface for use in type positions', () => {
      // If this compiles, the type-only re-export is reachable. The
      // runtime check just touches the variable so the import isn't
      // tree-shaken into oblivion by the test transformer.
      const req: EchoRequest = { message: 'hi' };
      const res: EchoResponse = { message: 'hi', receivedAt: '2026-01-01T00:00:00Z' };
      expect(req.message).toBe('hi');
      expect(res.receivedAt).toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('wire format round-trip', () => {
    it('encodes then decodes a message via the binary wire format', () => {
      const original: EchoRequest = { message: 'hello world' };
      const buf = PingV1.EchoRequest.encode(original).finish();
      const decoded = PingV1.EchoRequest.decode(buf);
      expect(decoded.message).toBe('hello world');
    });

    it('round-trips an EchoResponse including the receivedAt timestamp', () => {
      const original: EchoResponse = {
        message: 'pong',
        receivedAt: '2026-06-04T22:30:00Z',
      };
      const buf = PingV1.EchoResponse.encode(original).finish();
      const decoded = PingV1.EchoResponse.decode(buf);
      expect(decoded).toEqual(original);
    });
  });

  describe('JSON helpers (gateway REST translation surface)', () => {
    it('produces a plain JS object via toJSON', () => {
      const original: EchoRequest = { message: 'json' };
      const json = PingV1.EchoRequest.toJSON(original);
      expect(json).toEqual({ message: 'json' });
    });

    it('parses a JS object back into the message shape via fromJSON', () => {
      const restored = PingV1.EchoRequest.fromJSON({ message: 'json' });
      expect(restored).toEqual({ message: 'json' });
    });
  });

  describe('NotificationsV1 namespace (Phase 1.3a — gRPC services on)', () => {
    it('exports the message factories under the NotificationsV1 namespace', () => {
      expect(NotificationsV1.Notification).toBeDefined();
      expect(NotificationsV1.CreateNotificationRequest).toBeDefined();
      expect(NotificationsV1.ListNotificationsRequest).toBeDefined();
      expect(NotificationsV1.DismissNotificationRequest).toBeDefined();
    });

    it('exports the gRPC service definition table (outputServices=grpc-js)', () => {
      expect(NotificationsV1.NotificationServiceService).toBeDefined();
      // grpc-js Definition tables are objects keyed by method name with
      // a `path` (`/<package>.<Service>/<Method>`) on each entry. This
      // is the shape `server.addService(...)` consumes.
      expect(NotificationsV1.NotificationServiceService).toMatchObject({
        create: { path: '/adopt_dont_shop.notifications.v1.NotificationService/Create' },
        list: { path: '/adopt_dont_shop.notifications.v1.NotificationService/List' },
        dismiss: { path: '/adopt_dont_shop.notifications.v1.NotificationService/Dismiss' },
      });
    });

    it('exports a gRPC client constructor (callable to make a stub)', () => {
      expect(NotificationsV1.NotificationServiceClient).toBeDefined();
      expect(typeof NotificationsV1.NotificationServiceClient).toBe('function');
    });

    it('exposes the enum value sets that mirror the Postgres ENUM types', () => {
      // Sanity-check a value from each enum so a careless rename in
      // the .proto fails the test.
      expect(NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP).toBe(1);
      expect(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL).toBe(2);
      expect(NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_PENDING).toBe(1);
      expect(NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS).toBe(1);
      expect(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION
      ).toBe(1);
    });

    it('round-trips a CreateNotificationRequest through the binary wire format', () => {
      const original: CreateNotificationRequest = {
        userId: 'usr-1',
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS,
        channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
        title: 'Application submitted',
        message: 'Your application was received.',
        dataJson: '{"applicationId":"app-1"}',
        templateVariablesJson: '{}',
      };

      const buf = NotificationsV1.CreateNotificationRequest.encode(original).finish();
      const decoded = NotificationsV1.CreateNotificationRequest.decode(buf);

      expect(decoded.userId).toBe('usr-1');
      expect(decoded.title).toBe('Application submitted');
      expect(decoded.dataJson).toBe('{"applicationId":"app-1"}');
      expect(decoded.type).toBe(
        NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS
      );
    });

    it('flat type-only re-exports compile in type position', () => {
      const n: Notification = {
        notificationId: 'n-1',
        userId: 'u-1',
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_REMINDER,
        channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_LOW,
        status: NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_PENDING,
        title: 't',
        message: 'm',
        dataJson: '{}',
        templateVariablesJson: '{}',
        retryCount: 0,
        maxRetries: 3,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      // Runtime touches so the imports aren't tree-shaken into oblivion.
      expect(n.notificationId).toBe('n-1');
    });
  });

  describe('AuthV1 namespace (Phase 2.3a — proto + grpc-js stubs)', () => {
    it('exports the message factories under the AuthV1 namespace', () => {
      expect(AuthV1.LoginRequest).toBeDefined();
      expect(AuthV1.LoginResponse).toBeDefined();
      expect(AuthV1.LogoutRequest).toBeDefined();
      expect(AuthV1.RefreshTokenRequest).toBeDefined();
      expect(AuthV1.ValidateTokenRequest).toBeDefined();
      expect(AuthV1.ValidateTokenResponse).toBeDefined();
      expect(AuthV1.GetMeRequest).toBeDefined();
      expect(AuthV1.GetMeResponse).toBeDefined();
      expect(AuthV1.AssignRoleRequest).toBeDefined();
      expect(AuthV1.Principal).toBeDefined();
      expect(AuthV1.User).toBeDefined();
      expect(AuthV1.TokenPair).toBeDefined();
    });

    it('exports the gRPC service definition table for all six RPCs', () => {
      expect(AuthV1.AuthServiceService).toBeDefined();
      expect(AuthV1.AuthServiceService).toMatchObject({
        login: { path: '/adopt_dont_shop.auth.v1.AuthService/Login' },
        logout: { path: '/adopt_dont_shop.auth.v1.AuthService/Logout' },
        refreshToken: { path: '/adopt_dont_shop.auth.v1.AuthService/RefreshToken' },
        validateToken: { path: '/adopt_dont_shop.auth.v1.AuthService/ValidateToken' },
        getMe: { path: '/adopt_dont_shop.auth.v1.AuthService/GetMe' },
        assignRole: { path: '/adopt_dont_shop.auth.v1.AuthService/AssignRole' },
      });
    });

    it('exports a gRPC client constructor', () => {
      expect(AuthV1.AuthServiceClient).toBeDefined();
      expect(typeof AuthV1.AuthServiceClient).toBe('function');
    });

    it('UserRole enum covers all six lib.types.UserRole values', () => {
      // Counts only the populated (>0) variants — CAD lesson #X around
      // ts-proto's UNRECOGNIZED = -1 sentinel inflating naive counts.
      const populated = Object.values(AuthV1.UserRole).filter(v => typeof v === 'number' && v > 0);
      expect(populated).toHaveLength(6);
      expect(AuthV1.UserRole.USER_ROLE_ADOPTER).toBe(1);
      expect(AuthV1.UserRole.USER_ROLE_RESCUE_STAFF).toBe(2);
      expect(AuthV1.UserRole.USER_ROLE_ADMIN).toBe(3);
      expect(AuthV1.UserRole.USER_ROLE_MODERATOR).toBe(4);
      expect(AuthV1.UserRole.USER_ROLE_SUPER_ADMIN).toBe(5);
      expect(AuthV1.UserRole.USER_ROLE_SUPPORT_AGENT).toBe(6);
    });

    it('UserStatus enum covers all five auth.user_status values', () => {
      const populated = Object.values(AuthV1.UserStatus).filter(
        v => typeof v === 'number' && v > 0
      );
      expect(populated).toHaveLength(5);
      expect(AuthV1.UserStatus.USER_STATUS_ACTIVE).toBe(1);
      expect(AuthV1.UserStatus.USER_STATUS_PENDING_VERIFICATION).toBe(4);
    });

    it('round-trips a LoginRequest through the binary wire format', () => {
      const original: LoginRequest = {
        email: 'alex@example.com',
        password: 'hunter2',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      };
      const buf = AuthV1.LoginRequest.encode(original).finish();
      const decoded = AuthV1.LoginRequest.decode(buf);
      expect(decoded).toEqual(original);
    });

    it('round-trips a ValidateTokenResponse including the principal payload', () => {
      const original: ValidateTokenResponse = {
        principal: {
          userId: 'usr-1',
          roles: [AuthV1.UserRole.USER_ROLE_RESCUE_STAFF],
          permissions: ['pets.read', 'pets.update'],
          rescueId: 'rsc-1',
        },
        expiresAt: '2026-06-04T22:30:00Z',
      };
      const buf = AuthV1.ValidateTokenResponse.encode(original).finish();
      const decoded = AuthV1.ValidateTokenResponse.decode(buf);
      expect(decoded).toEqual(original);
    });

    it('flat type-only re-exports compile in type position', () => {
      const u: AuthUser = {
        userId: 'usr-1',
        email: 'alex@example.com',
        userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
        status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      expect(u.email).toBe('alex@example.com');
    });
  });

  describe('PetsV1 namespace (Phase 3.3a — proto + grpc-js stubs)', () => {
    it('exports the message factories under the PetsV1 namespace', () => {
      expect(PetsV1.Pet).toBeDefined();
      expect(PetsV1.PetStatusTransition).toBeDefined();
      expect(PetsV1.CreatePetRequest).toBeDefined();
      expect(PetsV1.GetPetRequest).toBeDefined();
      expect(PetsV1.ListPetsRequest).toBeDefined();
      expect(PetsV1.UpdatePetRequest).toBeDefined();
      expect(PetsV1.UpdatePetStatusRequest).toBeDefined();
      expect(PetsV1.DeletePetRequest).toBeDefined();
    });

    it('exports the gRPC service definition table for all six RPCs', () => {
      expect(PetsV1.PetServiceService).toBeDefined();
      expect(PetsV1.PetServiceService).toMatchObject({
        create: { path: '/adopt_dont_shop.pets.v1.PetService/Create' },
        get: { path: '/adopt_dont_shop.pets.v1.PetService/Get' },
        list: { path: '/adopt_dont_shop.pets.v1.PetService/List' },
        update: { path: '/adopt_dont_shop.pets.v1.PetService/Update' },
        updateStatus: { path: '/adopt_dont_shop.pets.v1.PetService/UpdateStatus' },
        delete: { path: '/adopt_dont_shop.pets.v1.PetService/Delete' },
      });
    });

    it('exports a gRPC client constructor', () => {
      expect(PetsV1.PetServiceClient).toBeDefined();
      expect(typeof PetsV1.PetServiceClient).toBe('function');
    });

    it('PetStatus enum covers all eight Postgres pet_status values', () => {
      const populated = Object.values(PetsV1.PetStatus).filter(v => typeof v === 'number' && v > 0);
      expect(populated).toHaveLength(8);
      expect(PetsV1.PetStatus.PET_STATUS_AVAILABLE).toBe(1);
      expect(PetsV1.PetStatus.PET_STATUS_DECEASED).toBe(8);
    });

    it('PetType enum covers all eight pet_type values', () => {
      const populated = Object.values(PetsV1.PetType).filter(v => typeof v === 'number' && v > 0);
      expect(populated).toHaveLength(8);
    });

    it('round-trips a CreatePetRequest through the binary wire format', () => {
      const original: CreatePetRequest = {
        name: 'Rex',
        rescueId: 'rsc-1',
        type: PetsV1.PetType.PET_TYPE_DOG,
        gender: PetsV1.PetGender.PET_GENDER_MALE,
        size: PetsV1.PetSize.PET_SIZE_LARGE,
        ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
        specialNeeds: false,
        houseTrained: true,
        temperamentJson: '["friendly","energetic"]',
        tagsJson: '[]',
        extraJson: '{}',
      };
      const buf = PetsV1.CreatePetRequest.encode(original).finish();
      const decoded = PetsV1.CreatePetRequest.decode(buf);
      expect(decoded.name).toBe('Rex');
      expect(decoded.type).toBe(PetsV1.PetType.PET_TYPE_DOG);
      expect(decoded.temperamentJson).toBe('["friendly","energetic"]');
    });

    it('flat type-only re-exports compile in type position', () => {
      const p: Pet = {
        petId: 'pet-1',
        name: 'Rex',
        type: PetsV1.PetType.PET_TYPE_DOG,
        status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
        gender: PetsV1.PetGender.PET_GENDER_MALE,
        size: PetsV1.PetSize.PET_SIZE_LARGE,
        ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
        archived: false,
        featured: false,
        priorityListing: false,
        specialNeeds: false,
        houseTrained: true,
        temperamentJson: '[]',
        tagsJson: '[]',
        extraJson: '{}',
        viewCount: 0,
        favoriteCount: 0,
        applicationCount: 0,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      expect(p.petId).toBe('pet-1');
    });
  });

  describe('RescueV1 namespace (Phase 4.3a — proto + grpc-js stubs)', () => {
    it('exports the message factories under the RescueV1 namespace', () => {
      expect(RescueV1.Rescue).toBeDefined();
      expect(RescueV1.Invitation).toBeDefined();
      expect(RescueV1.CreateRescueRequest).toBeDefined();
      expect(RescueV1.GetRescueRequest).toBeDefined();
      expect(RescueV1.ListRescuesRequest).toBeDefined();
      expect(RescueV1.UpdateRescueRequest).toBeDefined();
      expect(RescueV1.VerifyRescueRequest).toBeDefined();
      expect(RescueV1.InviteStaffRequest).toBeDefined();
    });

    it('exports the gRPC service definition table for all six RPCs', () => {
      expect(RescueV1.RescueServiceService).toBeDefined();
      expect(RescueV1.RescueServiceService).toMatchObject({
        create: { path: '/adopt_dont_shop.rescue.v1.RescueService/Create' },
        get: { path: '/adopt_dont_shop.rescue.v1.RescueService/Get' },
        list: { path: '/adopt_dont_shop.rescue.v1.RescueService/List' },
        update: { path: '/adopt_dont_shop.rescue.v1.RescueService/Update' },
        verify: { path: '/adopt_dont_shop.rescue.v1.RescueService/Verify' },
        inviteStaff: { path: '/adopt_dont_shop.rescue.v1.RescueService/InviteStaff' },
      });
    });

    it('exports a gRPC client constructor', () => {
      expect(RescueV1.RescueServiceClient).toBeDefined();
      expect(typeof RescueV1.RescueServiceClient).toBe('function');
    });

    it('RescueStatus enum covers all five Postgres rescue_status values', () => {
      const populated = Object.values(RescueV1.RescueStatus).filter(
        v => typeof v === 'number' && v > 0
      );
      expect(populated).toHaveLength(5);
      expect(RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED).toBe(2);
    });

    it('RescueVerificationSource enum covers all three values', () => {
      const populated = Object.values(RescueV1.RescueVerificationSource).filter(
        v => typeof v === 'number' && v > 0
      );
      expect(populated).toHaveLength(3);
    });

    it('round-trips a CreateRescueRequest through the binary wire format', () => {
      const original: CreateRescueRequest = {
        name: 'Pawsome Rescue',
        email: 'hello@pawsome.example',
        address: '1 High St',
        city: 'London',
        postcode: 'SW1A 1AA',
        contactPerson: 'Alex',
      };
      const buf = RescueV1.CreateRescueRequest.encode(original).finish();
      const decoded = RescueV1.CreateRescueRequest.decode(buf);
      expect(decoded.name).toBe('Pawsome Rescue');
      expect(decoded.email).toBe('hello@pawsome.example');
      expect(decoded.contactPerson).toBe('Alex');
    });

    it('flat type-only re-exports compile in type position', () => {
      const r: Rescue = {
        rescueId: 'rsc-1',
        name: 'Pawsome',
        email: 'hi@p.example',
        address: '1 High St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'GB',
        contactPerson: 'Alex',
        status: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
        settingsJson: '{}',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      expect(r.rescueId).toBe('rsc-1');
    });
  });

  describe('ApplicationsV1 namespace (Phase 5.3a — proto + grpc-js stubs)', () => {
    it('exports the message factories under the ApplicationsV1 namespace', () => {
      expect(ApplicationsV1.Application).toBeDefined();
      expect(ApplicationsV1.TimelineEntry).toBeDefined();
      expect(ApplicationsV1.StartDraftRequest).toBeDefined();
      expect(ApplicationsV1.SaveDraftAnswersRequest).toBeDefined();
      expect(ApplicationsV1.SubmitDraftRequest).toBeDefined();
      expect(ApplicationsV1.ApproveRequest).toBeDefined();
      expect(ApplicationsV1.RejectRequest).toBeDefined();
      expect(ApplicationsV1.WithdrawRequest).toBeDefined();
      expect(ApplicationsV1.MarkAdoptedRequest).toBeDefined();
    });

    it('exports the gRPC service definition table for all twelve RPCs', () => {
      expect(ApplicationsV1.ApplicationServiceService).toBeDefined();
      expect(ApplicationsV1.ApplicationServiceService).toMatchObject({
        startDraft: {
          path: '/adopt_dont_shop.applications.v1.ApplicationService/StartDraft',
        },
        saveDraftAnswers: {
          path: '/adopt_dont_shop.applications.v1.ApplicationService/SaveDraftAnswers',
        },
        submitDraft: {
          path: '/adopt_dont_shop.applications.v1.ApplicationService/SubmitDraft',
        },
        startReview: {
          path: '/adopt_dont_shop.applications.v1.ApplicationService/StartReview',
        },
        scheduleHomeVisit: {
          path: '/adopt_dont_shop.applications.v1.ApplicationService/ScheduleHomeVisit',
        },
        completeHomeVisit: {
          path: '/adopt_dont_shop.applications.v1.ApplicationService/CompleteHomeVisit',
        },
        approve: { path: '/adopt_dont_shop.applications.v1.ApplicationService/Approve' },
        reject: { path: '/adopt_dont_shop.applications.v1.ApplicationService/Reject' },
        withdraw: { path: '/adopt_dont_shop.applications.v1.ApplicationService/Withdraw' },
        markAdopted: {
          path: '/adopt_dont_shop.applications.v1.ApplicationService/MarkAdopted',
        },
        get: { path: '/adopt_dont_shop.applications.v1.ApplicationService/Get' },
        list: { path: '/adopt_dont_shop.applications.v1.ApplicationService/List' },
      });
    });

    it('exports a gRPC client constructor', () => {
      expect(ApplicationsV1.ApplicationServiceClient).toBeDefined();
      expect(typeof ApplicationsV1.ApplicationServiceClient).toBe('function');
    });

    it('ApplicationStatus enum covers all nine lifecycle states', () => {
      const populated = Object.values(ApplicationsV1.ApplicationStatus).filter(
        v => typeof v === 'number' && v > 0
      );
      expect(populated).toHaveLength(9);
      expect(ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_DRAFT).toBe(1);
      expect(ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_ADOPTED).toBe(9);
    });

    it('HomeVisitOutcome enum covers passed / failed / reschedule', () => {
      const populated = Object.values(ApplicationsV1.HomeVisitOutcome).filter(
        v => typeof v === 'number' && v > 0
      );
      expect(populated).toHaveLength(3);
    });

    it('round-trips a StartDraftRequest through the binary wire format', () => {
      const original: StartDraftRequest = { adopterId: 'usr-1', petId: 'pet-1' };
      const buf = ApplicationsV1.StartDraftRequest.encode(original).finish();
      const decoded = ApplicationsV1.StartDraftRequest.decode(buf);
      expect(decoded).toEqual(original);
    });

    it('flat type-only re-exports compile in type position', () => {
      const a: Application = {
        applicationId: 'app-1',
        adopterId: 'usr-1',
        petId: 'pet-1',
        rescueId: 'rsc-1',
        status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_DRAFT,
        answersJson: '{}',
        referencesJson: '[]',
        version: 0,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      expect(a.applicationId).toBe('app-1');
    });
  });

  describe('ChatV1 namespace (Phase 6.3a — proto + grpc-js stubs)', () => {
    it('exports the message factories under the ChatV1 namespace', () => {
      expect(ChatV1.Chat).toBeDefined();
      expect(ChatV1.Message).toBeDefined();
      expect(ChatV1.MessageReaction).toBeDefined();
      expect(ChatV1.OpenChatRequest).toBeDefined();
      expect(ChatV1.SendMessageRequest).toBeDefined();
      expect(ChatV1.ListMessagesRequest).toBeDefined();
      expect(ChatV1.MarkReadRequest).toBeDefined();
      expect(ChatV1.ReactRequest).toBeDefined();
    });

    it('exports the gRPC service definition table for all six RPCs', () => {
      expect(ChatV1.ChatServiceService).toBeDefined();
      expect(ChatV1.ChatServiceService).toMatchObject({
        openChat: { path: '/adopt_dont_shop.chat.v1.ChatService/OpenChat' },
        sendMessage: { path: '/adopt_dont_shop.chat.v1.ChatService/SendMessage' },
        listMessages: { path: '/adopt_dont_shop.chat.v1.ChatService/ListMessages' },
        listChats: { path: '/adopt_dont_shop.chat.v1.ChatService/ListChats' },
        markRead: { path: '/adopt_dont_shop.chat.v1.ChatService/MarkRead' },
        react: { path: '/adopt_dont_shop.chat.v1.ChatService/React' },
      });
    });

    it('exports a gRPC client constructor', () => {
      expect(ChatV1.ChatServiceClient).toBeDefined();
      expect(typeof ChatV1.ChatServiceClient).toBe('function');
    });

    it('round-trips a SendMessageRequest through the binary wire format', () => {
      const original: SendMessageRequest = { chatId: 'c-1', body: 'hello' };
      const buf = ChatV1.SendMessageRequest.encode(original).finish();
      const decoded = ChatV1.SendMessageRequest.decode(buf);
      expect(decoded).toEqual(original);
    });

    it('flat type-only re-exports compile in type position', () => {
      const c: Chat = {
        chatId: 'c-1',
        applicationId: 'app-1',
        participantUserIds: ['usr-1', 'usr-2'],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      expect(c.chatId).toBe('c-1');
    });
  });

  describe('ModerationV1 namespace (Phase 8.3a — proto + grpc-js stubs)', () => {
    it('exports the message factories under the ModerationV1 namespace', () => {
      expect(ModerationV1.Report).toBeDefined();
      expect(ModerationV1.ReportStatusTransition).toBeDefined();
      expect(ModerationV1.ModeratorAction).toBeDefined();
      expect(ModerationV1.Evidence).toBeDefined();
      expect(ModerationV1.UserSanction).toBeDefined();
      expect(ModerationV1.SupportTicket).toBeDefined();
      expect(ModerationV1.SupportTicketResponse).toBeDefined();
      expect(ModerationV1.FileReportRequest).toBeDefined();
      expect(ModerationV1.AssignReportRequest).toBeDefined();
      expect(ModerationV1.LogModeratorActionRequest).toBeDefined();
      expect(ModerationV1.IssueSanctionRequest).toBeDefined();
      expect(ModerationV1.OpenSupportTicketRequest).toBeDefined();
    });

    it('exports the gRPC service definition table for all fourteen RPCs', () => {
      expect(ModerationV1.ModerationServiceService).toBeDefined();
      expect(ModerationV1.ModerationServiceService).toMatchObject({
        fileReport: { path: '/adopt_dont_shop.moderation.v1.ModerationService/FileReport' },
        getReport: { path: '/adopt_dont_shop.moderation.v1.ModerationService/GetReport' },
        listReports: { path: '/adopt_dont_shop.moderation.v1.ModerationService/ListReports' },
        assignReport: { path: '/adopt_dont_shop.moderation.v1.ModerationService/AssignReport' },
        resolveReport: { path: '/adopt_dont_shop.moderation.v1.ModerationService/ResolveReport' },
        logModeratorAction: {
          path: '/adopt_dont_shop.moderation.v1.ModerationService/LogModeratorAction',
        },
        listModeratorActions: {
          path: '/adopt_dont_shop.moderation.v1.ModerationService/ListModeratorActions',
        },
        addEvidence: { path: '/adopt_dont_shop.moderation.v1.ModerationService/AddEvidence' },
        issueSanction: { path: '/adopt_dont_shop.moderation.v1.ModerationService/IssueSanction' },
        listUserSanctions: {
          path: '/adopt_dont_shop.moderation.v1.ModerationService/ListUserSanctions',
        },
        appealSanction: { path: '/adopt_dont_shop.moderation.v1.ModerationService/AppealSanction' },
        openSupportTicket: {
          path: '/adopt_dont_shop.moderation.v1.ModerationService/OpenSupportTicket',
        },
        getSupportTicket: {
          path: '/adopt_dont_shop.moderation.v1.ModerationService/GetSupportTicket',
        },
        listSupportTickets: {
          path: '/adopt_dont_shop.moderation.v1.ModerationService/ListSupportTickets',
        },
        respondToTicket: {
          path: '/adopt_dont_shop.moderation.v1.ModerationService/RespondToTicket',
        },
      });
    });

    it('exports a gRPC client constructor', () => {
      expect(ModerationV1.ModerationServiceClient).toBeDefined();
      expect(typeof ModerationV1.ModerationServiceClient).toBe('function');
    });

    it('round-trips a FileReportRequest through the binary wire format', () => {
      const original: FileReportRequest = {
        reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
        reportedEntityId: 'usr-123',
        category: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT,
        severity: ModerationV1.Severity.SEVERITY_HIGH,
        title: 'abusive DMs',
        description: 'user sent threatening messages',
      };
      const buf = ModerationV1.FileReportRequest.encode(original).finish();
      const decoded = ModerationV1.FileReportRequest.decode(buf);
      expect(decoded).toMatchObject(original);
    });

    it('flat type-only re-exports compile in type position', () => {
      const r: Report = {
        reportId: 'rpt-1',
        reporterId: 'usr-1',
        reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
        reportedEntityId: 'usr-2',
        category: ModerationV1.ReportCategory.REPORT_CATEGORY_SPAM,
        severity: ModerationV1.Severity.SEVERITY_LOW,
        status: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
        title: 'spam',
        description: 'spam profile',
        metadataJson: '{}',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      expect(r.reportId).toBe('rpt-1');
    });

    it('mirrors the moderation.* Postgres enum values verbatim (excluding UNSPECIFIED + UNRECOGNIZED sentinels)', () => {
      // Bite #10: ts-proto adds UNRECOGNIZED = -1; UNSPECIFIED = 0
      // is the proto3 sentinel. Both filtered.
      const reportStatusValues = Object.values(ModerationV1.ReportStatus).filter(
        (v): v is number => typeof v === 'number' && v > 0
      );
      // pending, under_review, resolved, dismissed, escalated = 5
      expect(reportStatusValues).toHaveLength(5);

      const sanctionTypeValues = Object.values(ModerationV1.SanctionType).filter(
        (v): v is number => typeof v === 'number' && v > 0
      );
      // warning, restriction, temporary_ban, permanent_ban,
      // messaging_restriction, posting_restriction,
      // application_restriction = 7
      expect(sanctionTypeValues).toHaveLength(7);
    });
  });

  describe('MatchingV1 namespace (Phase 9.3a — proto + grpc-js stubs)', () => {
    it('exports the message factories under the MatchingV1 namespace', () => {
      expect(MatchingV1.SwipeSession).toBeDefined();
      expect(MatchingV1.PetCandidate).toBeDefined();
      expect(MatchingV1.SwipeActionRecord).toBeDefined();
      expect(MatchingV1.StartSessionRequest).toBeDefined();
      expect(MatchingV1.EndSessionRequest).toBeDefined();
      expect(MatchingV1.RecommendRequest).toBeDefined();
      expect(MatchingV1.RecordSwipeRequest).toBeDefined();
      expect(MatchingV1.SearchPetsRequest).toBeDefined();
      expect(MatchingV1.ListSwipeHistoryRequest).toBeDefined();
    });

    it('exports the gRPC service definition table for all six RPCs', () => {
      expect(MatchingV1.MatchingServiceService).toBeDefined();
      expect(MatchingV1.MatchingServiceService).toMatchObject({
        startSession: { path: '/adopt_dont_shop.matching.v1.MatchingService/StartSession' },
        endSession: { path: '/adopt_dont_shop.matching.v1.MatchingService/EndSession' },
        recommend: { path: '/adopt_dont_shop.matching.v1.MatchingService/Recommend' },
        recordSwipe: { path: '/adopt_dont_shop.matching.v1.MatchingService/RecordSwipe' },
        searchPets: { path: '/adopt_dont_shop.matching.v1.MatchingService/SearchPets' },
        listSwipeHistory: {
          path: '/adopt_dont_shop.matching.v1.MatchingService/ListSwipeHistory',
        },
      });
    });

    it('exports a gRPC client constructor', () => {
      expect(MatchingV1.MatchingServiceClient).toBeDefined();
      expect(typeof MatchingV1.MatchingServiceClient).toBe('function');
    });

    it('round-trips a RecordSwipeRequest through the binary wire format', () => {
      const original: RecordSwipeRequest = {
        sessionId: 'sess-1',
        petId: 'pet-1',
        action: MatchingV1.SwipeAction.SWIPE_ACTION_SUPER_LIKE,
        responseTime: 1234,
      };
      const buf = MatchingV1.RecordSwipeRequest.encode(original).finish();
      const decoded = MatchingV1.RecordSwipeRequest.decode(buf);
      expect(decoded).toMatchObject(original);
    });

    it('round-trips a StartSessionRequest with the filters_json blob trick', () => {
      const original: StartSessionRequest = {
        filtersJson: '{"species":"dog","maxAge":5}',
        deviceType: MatchingV1.DeviceType.DEVICE_TYPE_MOBILE,
      };
      const buf = MatchingV1.StartSessionRequest.encode(original).finish();
      const decoded = MatchingV1.StartSessionRequest.decode(buf);
      expect(decoded.filtersJson).toBe('{"species":"dog","maxAge":5}');
      expect(decoded.deviceType).toBe(MatchingV1.DeviceType.DEVICE_TYPE_MOBILE);
    });

    it('flat type-only re-exports compile in type position', () => {
      const s: SwipeSession = {
        sessionId: 'sess-1',
        startTime: '2026-06-01T00:00:00Z',
        totalSwipes: 0,
        likes: 0,
        passes: 0,
        superLikes: 0,
        filtersJson: '{}',
        deviceType: MatchingV1.DeviceType.DEVICE_TYPE_UNKNOWN,
        isActive: true,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      expect(s.sessionId).toBe('sess-1');
    });

    it('mirrors the matching.* Postgres enum values verbatim (excluding UNSPECIFIED + UNRECOGNIZED sentinels)', () => {
      const swipeActionValues = Object.values(MatchingV1.SwipeAction).filter(
        (v): v is number => typeof v === 'number' && v > 0
      );
      // like, pass, super_like, info = 4
      expect(swipeActionValues).toHaveLength(4);

      const deviceTypeValues = Object.values(MatchingV1.DeviceType).filter(
        (v): v is number => typeof v === 'number' && v > 0
      );
      // desktop, mobile, tablet, unknown = 4
      expect(deviceTypeValues).toHaveLength(4);
    });
  });
});

describe('@adopt-dont-shop/proto AuditV1', () => {
  describe('AuditV1 namespace (Phase 10.3a — proto + grpc-js stubs)', () => {
    it('exports the message factories under the AuditV1 namespace', () => {
      expect(AuditV1.AuditEvent).toBeDefined();
      expect(AuditV1.QueryRequest).toBeDefined();
      expect(AuditV1.QueryResponse).toBeDefined();
      expect(AuditV1.GetByTargetRequest).toBeDefined();
      expect(AuditV1.GetByTargetResponse).toBeDefined();
    });

    it('exports the gRPC service definition table for both RPCs', () => {
      expect(AuditV1.AuditQueryServiceService).toBeDefined();
      expect(AuditV1.AuditQueryServiceService).toMatchObject({
        query: { path: '/adopt_dont_shop.audit.v1.AuditQueryService/Query' },
        getByTarget: { path: '/adopt_dont_shop.audit.v1.AuditQueryService/GetByTarget' },
      });
    });

    it('exports a gRPC client constructor', () => {
      expect(AuditV1.AuditQueryServiceClient).toBeDefined();
      expect(typeof AuditV1.AuditQueryServiceClient).toBe('function');
    });

    it('round-trips a QueryRequest with filters through the binary wire format', () => {
      const original: AuditQueryRequest = {
        limit: 50,
        service: 'service.auth',
        actorUserId: 'usr-1',
        outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED,
      };
      const buf = AuditV1.QueryRequest.encode(original).finish();
      const decoded = AuditV1.QueryRequest.decode(buf);
      expect(decoded.limit).toBe(50);
      expect(decoded.service).toBe('service.auth');
      expect(decoded.actorUserId).toBe('usr-1');
      expect(decoded.outcome).toBe(AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED);
    });

    it('flat type-only re-exports compile in type position', () => {
      const e: AuditEvent = {
        eventId: 'evt-1',
        service: 'service.auth',
        subject: 'auth.userLoggedIn',
        aggregateType: 'user',
        aggregateId: 'usr-1',
        action: 'login',
        outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS,
        occurredAt: '2026-06-01T00:00:00Z',
        recordedAt: '2026-06-01T00:00:00Z',
        payloadJson: '{}',
      };
      expect(e.eventId).toBe('evt-1');
    });

    it('mirrors the audit.outcome semantic verbatim (excluding UNSPECIFIED + UNRECOGNIZED sentinels)', () => {
      const populated = Object.values(AuditV1.AuditOutcome).filter(
        (v): v is number => typeof v === 'number' && v > 0
      );
      // success, denied, failure = 3
      expect(populated).toHaveLength(3);
    });
  });
});
