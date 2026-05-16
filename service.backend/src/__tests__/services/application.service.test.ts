import { vi } from 'vitest';
/**
 * Application Service - Business Logic Tests
 *
 * These tests focus on business rules, workflows, and edge cases rather than implementation details.
 * Tests are organized by business scenarios and validate that business rules are correctly enforced.
 */

// ADS-579: mock NotificationService so that the rejection notification path
// is observable without touching the real Notification table.
vi.mock('../../services/notification.service', () => ({
  NotificationService: {
    createNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

// ADS-579: extend the global email service mock (defined in setup-tests.ts)
// with getTemplateByName so the rejection-email path can resolve a template.
vi.mock('../../services/email.service', () => ({
  default: {
    sendEmail: vi.fn().mockResolvedValue('email-id-default'),
    queueEmail: vi.fn().mockResolvedValue(undefined),
    getTemplateByName: vi.fn().mockResolvedValue(null),
  },
}));

import { ApplicationService } from '../../services/application.service';
import Application, { ApplicationStatus, ApplicationPriority } from '../../models/Application';
import ApplicationAnswer from '../../models/ApplicationAnswer';
import ApplicationReferenceModel from '../../models/ApplicationReference';
import ApplicationStatusTransition from '../../models/ApplicationStatusTransition';
import Pet, { PetStatus } from '../../models/Pet';
import StaffMember from '../../models/StaffMember';
import User, { UserType } from '../../models/User';
import emailService from '../../services/email.service';
import { NotificationService } from '../../services/notification.service';
import { CreateApplicationRequest, ApplicationStatusUpdateRequest } from '../../types/application';

// Cast models to mocked versions
const MockedApplication = Application as vi.MockedObject<Application>;
const MockedApplicationAnswer = ApplicationAnswer as vi.MockedObject<typeof ApplicationAnswer>;
const MockedApplicationReference = ApplicationReferenceModel as vi.MockedObject<
  typeof ApplicationReferenceModel
>;
const MockedPet = Pet as vi.MockedObject<Pet>;
const MockedStaffMember = StaffMember as vi.MockedObject<typeof StaffMember>;
const MockedUser = User as vi.MockedObject<User>;
const MockedApplicationStatusTransition = ApplicationStatusTransition as vi.MockedObject<
  typeof ApplicationStatusTransition
>;

describe('ApplicationService - Business Logic', () => {
  // Test data
  const mockUserId = 'user-123';
  const mockPetId = 'pet-456';
  const mockRescueId = 'rescue-789';
  const mockApplicationId = 'app-001';

  const createMockUser = (overrides = {}) => ({
    userId: mockUserId,
    email: 'adopter@example.com',
    firstName: 'John',
    lastName: 'Doe',
    userType: UserType.ADOPTER,
    status: 'active',
    toJSON: vi.fn().mockReturnThis(),
    ...overrides,
  });

  const createMockPet = (overrides = {}) => ({
    petId: mockPetId,
    pet_id: mockPetId,
    name: 'Buddy',
    type: 'dog',
    status: PetStatus.AVAILABLE,
    rescueId: mockRescueId,
    rescue_id: mockRescueId, // snake_case for database field
    toJSON: vi.fn().mockReturnThis(),
    ...overrides,
  });

  const createMockApplication = (status = ApplicationStatus.SUBMITTED, overrides = {}) => ({
    applicationId: mockApplicationId,
    userId: mockUserId,
    petId: mockPetId,
    rescueId: mockRescueId,
    status,
    // answers moved to application_answers (plan 2.1) — no longer a
    // column on Application; tests that need answer rows mock
    // ApplicationAnswer.findAll / bulkCreate directly.
    // references[] moved to application_references (plan 2.1) — no
    // longer a column on Application.
    priority: ApplicationPriority.NORMAL,
    submittedAt: new Date(),
    update: vi.fn().mockResolvedValue(true),
    reload: vi.fn().mockResolvedValue(true),
    save: vi.fn().mockResolvedValue(true),
    destroy: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockReturnThis(),
    canTransitionTo: vi.fn(),
    ...overrides,
  });

  const createValidApplicationRequest = (): CreateApplicationRequest => ({
    petId: mockPetId,
    answers: {
      experience: 'I have owned dogs for 10 years',
      has_yard: 'yes',
      family_agreement: 'yes',
    },
    references: [
      {
        id: 'ref-0',
        name: 'Jane Smith',
        relationship: 'friend',
        phone: '555-0100',
        email: 'jane@example.com',
      },
    ],
    priority: ApplicationPriority.NORMAL,
    notes: 'Very excited to adopt!',
    tags: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // The status-transition log is a real model and would otherwise hit the DB
    // (and trip an FK on the mocked application_id). Stub it out — these tests
    // care about service behaviour, not the trigger/hook plumbing, which has
    // its own dedicated tests.
    MockedApplicationStatusTransition.create = vi.fn().mockResolvedValue({} as never);
    // Same reasoning as the transition stub: with mocked Application.create
    // returning a fake row, ApplicationReference.bulkCreate would trip the
    // FK on the SQLite test DB (plan 2.1).
    MockedApplicationReference.bulkCreate = vi.fn().mockResolvedValue([] as never);
    MockedApplicationReference.findAll = vi.fn().mockResolvedValue([] as never);
    MockedApplicationReference.destroy = vi.fn().mockResolvedValue(0 as never);
    // Same reasoning for the application_answers typed table (plan 2.1).
    MockedApplicationAnswer.bulkCreate = vi.fn().mockResolvedValue([] as never);
    MockedApplicationAnswer.findAll = vi.fn().mockResolvedValue([] as never);
    MockedApplicationAnswer.destroy = vi.fn().mockResolvedValue(0 as never);
  });

  describe('Business Rule: Application Creation', () => {
    it('creates application successfully with valid data', async () => {
      // Given: Valid user, available pet, and application data
      const mockUser = createMockUser();
      const mockPet = createMockPet();
      const mockApplication = createMockApplication();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = vi.fn().mockResolvedValue(null); // No duplicate
      MockedApplication.create = vi.fn().mockResolvedValue(mockApplication);

      // When: User creates application
      const result = await ApplicationService.createApplication(request, mockUserId);

      // Then: Application is created with SUBMITTED status
      expect(MockedUser.findByPk).toHaveBeenCalledWith(mockUserId);
      expect(MockedPet.findByPk).toHaveBeenCalledWith(
        mockPetId,
        expect.objectContaining({ lock: expect.any(String), transaction: expect.anything() })
      );
      expect(MockedApplication.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            petId: mockPetId,
          }),
        })
      );
      // Answers are persisted to the application_answers typed table
      // now (plan 2.1), not the parent Application row.
      expect(MockedApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          petId: mockPetId,
          rescueId: mockRescueId,
          status: ApplicationStatus.SUBMITTED,
        }),
        expect.objectContaining({ transaction: expect.anything() })
      );
      expect(MockedApplicationAnswer.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            application_id: mockApplicationId,
            question_key: 'experience',
          }),
        ]),
        expect.objectContaining({ transaction: expect.anything() })
      );
      expect(result).toBeDefined();
    });

    it('prevents duplicate applications for same pet', async () => {
      // Given: User already has an application for this pet
      const mockUser = createMockUser();
      const mockPet = createMockPet();
      const existingApplication = createMockApplication();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = vi.fn().mockResolvedValue(existingApplication);

      // When & Then: Duplicate application is rejected
      await expect(ApplicationService.createApplication(request, mockUserId)).rejects.toThrow(
        'already have an active application'
      );

      expect(MockedApplication.create).not.toHaveBeenCalled();
    });

    it('prevents application when pet is not available', async () => {
      // Given: Pet is already adopted
      const mockUser = createMockUser();
      const mockPet = createMockPet({ status: PetStatus.ADOPTED });
      const request = createValidApplicationRequest();

      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      // When & Then: Application is rejected
      await expect(ApplicationService.createApplication(request, mockUserId)).rejects.toThrow(
        'not available'
      );

      expect(MockedApplication.create).not.toHaveBeenCalled();
    });

    it('requires user to exist', async () => {
      // Given: User does not exist
      const request = createValidApplicationRequest();

      MockedUser.findByPk = vi.fn().mockResolvedValue(null);

      // When & Then: Application is rejected
      await expect(ApplicationService.createApplication(request, mockUserId)).rejects.toThrow(
        'User not found'
      );
    });

    it('requires pet to exist', async () => {
      // Given: Pet does not exist
      const mockUser = createMockUser();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = vi.fn().mockResolvedValue(null);

      // When & Then: Application is rejected
      await expect(ApplicationService.createApplication(request, mockUserId)).rejects.toThrow(
        'Pet not found'
      );
    });
  });

  describe('Business Rule: Status Transition Validation', () => {
    it('allows SUBMITTED → APPROVED transition', async () => {
      // Given: Application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When: Rescue approves application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.APPROVED,
        actionedBy: 'rescue-staff-123',
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        'rescue-staff-123'
      );

      // Then: a status transition is logged with toStatus = APPROVED.
      // applications.status is updated by the AFTER INSERT trigger (Postgres)
      // / afterCreate hook (SQLite tests), not by the service directly.
      expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: mockApplicationId,
          toStatus: ApplicationStatus.APPROVED,
          transitionedBy: 'rescue-staff-123',
        })
      );
    });

    it('allows SUBMITTED → REJECTED transition with reason', async () => {
      // Given: Application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When: Rescue rejects application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.REJECTED,
        rejectionReason: 'Not a good fit for this pet',
        actionedBy: 'rescue-staff-123',
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        'rescue-staff-123'
      );

      // Then: rejection reason is persisted on the application row, and the
      // transition log captures the status change with the same reason.
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          rejectionReason: 'Not a good fit for this pet',
        })
      );
      expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: mockApplicationId,
          toStatus: ApplicationStatus.REJECTED,
          reason: 'Not a good fit for this pet',
        })
      );
    });

    it('prevents APPROVED → REJECTED transition', async () => {
      // Given: Application already APPROVED
      const mockApplication = createMockApplication(ApplicationStatus.APPROVED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(false);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When & Then: Cannot reverse approval
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.REJECTED,
        actionedBy: 'rescue-staff-123',
      };

      await expect(
        ApplicationService.updateApplicationStatus(
          mockApplicationId,
          updateRequest,
          'rescue-staff-123'
        )
      ).rejects.toThrow('Cannot transition from approved to rejected');

      expect(mockApplication.update).not.toHaveBeenCalled();
    });

    it('prevents REJECTED → APPROVED transition', async () => {
      // Given: Application already REJECTED
      const mockApplication = createMockApplication(ApplicationStatus.REJECTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(false);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When & Then: Cannot reverse rejection
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.APPROVED,
        actionedBy: 'rescue-staff-123',
      };

      await expect(
        ApplicationService.updateApplicationStatus(
          mockApplicationId,
          updateRequest,
          'rescue-staff-123'
        )
      ).rejects.toThrow('Cannot transition from rejected to approved');

      expect(mockApplication.update).not.toHaveBeenCalled();
    });

    it('allows SUBMITTED → WITHDRAWN transition by adopter', async () => {
      // Given: Application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When: Adopter withdraws application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.WITHDRAWN,
        actionedBy: mockUserId,
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        mockUserId
      );

      // Then: a transition is logged with toStatus = WITHDRAWN.
      expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: mockApplicationId,
          toStatus: ApplicationStatus.WITHDRAWN,
          transitionedBy: mockUserId,
        })
      );
    });

    it('prevents APPROVED → WITHDRAWN transition', async () => {
      // Given: Application already APPROVED
      const mockApplication = createMockApplication(ApplicationStatus.APPROVED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(false);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When & Then: Cannot withdraw approved application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.WITHDRAWN,
        actionedBy: mockUserId,
      };

      await expect(
        ApplicationService.updateApplicationStatus(mockApplicationId, updateRequest, mockUserId)
      ).rejects.toThrow('Cannot transition from approved to withdrawn');
    });

    it('rejects status update when caller is rescue staff at a different rescue [ADS-234]', async () => {
      // Given: application owned by rescue-789, caller is staff at a DIFFERENT rescue.
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);
      MockedStaffMember.findOne = vi.fn().mockResolvedValue({
        userId: 'foreign-staff-id',
        rescueId: 'rescue-OTHER',
        isVerified: true,
      });

      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.APPROVED,
        actionedBy: 'foreign-staff-id',
      };

      await expect(
        ApplicationService.updateApplicationStatus(
          mockApplicationId,
          updateRequest,
          'foreign-staff-id',
          UserType.RESCUE_STAFF
        )
      ).rejects.toThrow(/Access denied/);

      // The status transition row must NOT be created — the IDOR attempt
      // is rejected before any side-effects.
      expect(MockedApplicationStatusTransition.create).not.toHaveBeenCalled();
    });

    it('allows status update when admin caller has no staff membership [ADS-234]', async () => {
      // Given: admin caller, no StaffMember row needed.
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);
      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);
      MockedStaffMember.findOne = vi.fn().mockResolvedValue(null);

      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.APPROVED,
        actionedBy: 'admin-user-id',
      };

      await expect(
        ApplicationService.updateApplicationStatus(
          mockApplicationId,
          updateRequest,
          'admin-user-id',
          UserType.ADMIN
        )
      ).resolves.toBeDefined();

      expect(MockedApplicationStatusTransition.create).toHaveBeenCalled();
    });
  });

  describe('Business Rule: Application Modification', () => {
    it('allows user to update their own SUBMITTED application', async () => {
      // Given: User owns application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      mockApplication.userId = mockUserId;

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When: User updates answers
      const updates = {
        answers: {
          experience: 'Updated experience details',
          has_yard: 'yes',
        },
      };

      await ApplicationService.updateApplication(mockApplicationId, updates, mockUserId);

      // Then: answers are persisted to the typed table (plan 2.1).
      // The parent Application.update no longer carries the answers
      // field — replace-all semantics destroy + bulkCreate the rows.
      expect(MockedApplicationAnswer.destroy).toHaveBeenCalledWith({
        where: { application_id: mockApplicationId },
      });
      expect(MockedApplicationAnswer.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            application_id: mockApplicationId,
            question_key: 'experience',
            answer_value: 'Updated experience details',
          }),
          expect.objectContaining({
            application_id: mockApplicationId,
            question_key: 'has_yard',
            answer_value: 'yes',
          }),
        ])
      );
    });

    it('prevents modifications to APPROVED applications', async () => {
      // Given: Application is APPROVED
      const mockApplication = createMockApplication(ApplicationStatus.APPROVED);
      mockApplication.userId = mockUserId;

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When & Then: Update is rejected
      const updates = { answers: { experience: 'New info' } };

      await expect(
        ApplicationService.updateApplication(mockApplicationId, updates, mockUserId)
      ).rejects.toThrow('Application cannot be updated once processed');

      expect(mockApplication.update).not.toHaveBeenCalled();
    });

    it('prevents modifications to REJECTED applications', async () => {
      // Given: Application is REJECTED
      const mockApplication = createMockApplication(ApplicationStatus.REJECTED);
      mockApplication.userId = mockUserId;

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When & Then: Update is rejected
      const updates = { answers: { experience: 'New info' } };

      await expect(
        ApplicationService.updateApplication(mockApplicationId, updates, mockUserId)
      ).rejects.toThrow('Application cannot be updated once processed');

      expect(mockApplication.update).not.toHaveBeenCalled();
    });

    it("prevents user from modifying another user's application", async () => {
      // Given: Application belongs to different user
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      mockApplication.userId = 'other-user-456';

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When & Then: Update is rejected
      const updates = { answers: { experience: 'Hacked!' } };

      await expect(
        ApplicationService.updateApplication(mockApplicationId, updates, mockUserId)
      ).rejects.toThrow('Access denied');

      expect(mockApplication.update).not.toHaveBeenCalled();
    });
  });

  describe('Business Rule: Access Control', () => {
    it('allows user to view their own application', async () => {
      // Given: User owns application
      const mockApplication = createMockApplication();
      mockApplication.userId = mockUserId;

      MockedApplication.findOne = vi.fn().mockResolvedValue(mockApplication);

      // When: User requests their application
      const result = await ApplicationService.getApplicationById(
        mockApplicationId,
        mockUserId,
        UserType.ADOPTER
      );

      // Then: Application is returned
      expect(result).toBeDefined();
      expect(MockedApplication.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            applicationId: mockApplicationId,
          }),
        })
      );
    });

    it("prevents user from viewing another user's application", async () => {
      // Given: Application belongs to different user
      const mockApplication = createMockApplication();
      mockApplication.userId = 'other-user-456';

      MockedApplication.findOne = vi.fn().mockResolvedValue(mockApplication);

      // When & Then: Access denied
      await expect(
        ApplicationService.getApplicationById(mockApplicationId, mockUserId, UserType.ADOPTER)
      ).rejects.toThrow('Access denied');
    });

    it('allows rescue staff to view applications for their pets', async () => {
      // Given: Application for pet belonging to rescue
      const mockApplication = createMockApplication();
      mockApplication.rescueId = mockRescueId;

      MockedApplication.findOne = vi.fn().mockResolvedValue(mockApplication);
      MockedStaffMember.findOne = vi
        .fn()
        .mockResolvedValue({ userId: 'rescue-staff-123', rescueId: mockRescueId });

      // When: Rescue staff views application
      const result = await ApplicationService.getApplicationById(
        mockApplicationId,
        'rescue-staff-123',
        UserType.RESCUE_STAFF
      );

      // Then: Application is returned
      expect(result).toBeDefined();
    });

    it('allows admin to view any application', async () => {
      // Given: Any application
      const mockApplication = createMockApplication();

      MockedApplication.findOne = vi.fn().mockResolvedValue(mockApplication);

      // When: Admin views application
      const result = await ApplicationService.getApplicationById(
        mockApplicationId,
        'admin-123',
        UserType.ADMIN
      );

      // Then: Application is returned
      expect(result).toBeDefined();
    });
  });

  describe('Business Invariants', () => {
    it('always creates application with SUBMITTED status', async () => {
      // Given: Valid application request
      const mockUser = createMockUser();
      const mockPet = createMockPet();
      const mockApplication = createMockApplication();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = vi.fn().mockResolvedValue(null);
      MockedApplication.create = vi.fn().mockResolvedValue(mockApplication);

      // When: Application is created
      await ApplicationService.createApplication(request, mockUserId);

      // Then: Status is SUBMITTED (not APPROVED or REJECTED)
      expect(MockedApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApplicationStatus.SUBMITTED,
        }),
        expect.objectContaining({ transaction: expect.anything() })
      );
    });

    it('sets submittedAt timestamp on creation', async () => {
      // Given: Valid application request with submittedAt in mock
      const mockUser = createMockUser();
      const mockPet = createMockPet();
      const mockApplication = createMockApplication();
      mockApplication.submittedAt = new Date();
      mockApplication.toJSON = vi.fn().mockReturnValue({
        ...mockApplication,
        submittedAt: mockApplication.submittedAt,
      });
      const request = createValidApplicationRequest();

      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = vi.fn().mockResolvedValue(null);
      MockedApplication.create = vi.fn().mockResolvedValue(mockApplication);

      // When: Application is created
      const result = await ApplicationService.createApplication(request, mockUserId);

      // Then: Application was created and has submittedAt (set by model default)
      expect(MockedApplication.create).toHaveBeenCalled();
      expect(mockApplication.toJSON).toHaveBeenCalled();
    });

    it('sets decisionAt timestamp when application is approved', async () => {
      // Given: Application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When: Application is approved
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.APPROVED,
        actionedBy: 'rescue-staff-123',
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        'rescue-staff-123'
      );

      // Then: decisionAt timestamp is set
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          decisionAt: expect.any(Date),
        })
      );
    });

    it('sets decisionAt timestamp when application is rejected', async () => {
      // Given: Application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When: Application is rejected
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.REJECTED,
        rejectionReason: 'Not suitable',
        actionedBy: 'rescue-staff-123',
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        'rescue-staff-123'
      );

      // Then: decisionAt timestamp is set
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          decisionAt: expect.any(Date),
        })
      );
    });

    it('preserves rescueId from pet when creating application', async () => {
      // Given: Pet belongs to specific rescue
      const mockUser = createMockUser();
      const mockPet = createMockPet({ rescueId: 'rescue-xyz-789', rescue_id: 'rescue-xyz-789' });
      const mockApplication = createMockApplication();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = vi.fn().mockResolvedValue(null);
      MockedApplication.create = vi.fn().mockResolvedValue(mockApplication);

      // When: Application is created
      await ApplicationService.createApplication(request, mockUserId);

      // Then: Application has correct rescueId
      expect(MockedApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rescueId: 'rescue-xyz-789',
        }),
        expect.objectContaining({ transaction: expect.anything() })
      );
    });
  });

  describe('Business Rule: Withdrawal Conditions', () => {
    it('allows user to withdraw their own SUBMITTED application', async () => {
      // Given: User owns application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      mockApplication.userId = mockUserId;
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When: User withdraws application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.WITHDRAWN,
        actionedBy: mockUserId,
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        mockUserId
      );

      // Then: Application is withdrawn (a transition is logged).
      expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: mockApplicationId,
          toStatus: ApplicationStatus.WITHDRAWN,
          transitionedBy: mockUserId,
        })
      );
    });

    it('prevents withdrawal of approved applications', async () => {
      // Given: Application is APPROVED
      const mockApplication = createMockApplication(ApplicationStatus.APPROVED);
      mockApplication.userId = mockUserId;
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(false);

      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      // When & Then: Withdrawal is rejected
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.WITHDRAWN,
        actionedBy: mockUserId,
      };

      await expect(
        ApplicationService.updateApplicationStatus(mockApplicationId, updateRequest, mockUserId)
      ).rejects.toThrow('Cannot transition');

      expect(mockApplication.update).not.toHaveBeenCalled();
    });
  });

  describe('Business Rule: Application Search Sorting', () => {
    const mockApplicationRow = () => {
      const app = createMockApplication();
      return {
        ...app,
        toJSON: vi.fn().mockReturnValue(app),
        Answers: [],
      };
    };

    beforeEach(() => {
      MockedApplication.findAndCountAll = vi.fn().mockResolvedValue({
        rows: [mockApplicationRow()],
        count: 1,
      });
    });

    it('allows sorting by submittedAt', async () => {
      // Given: A request to sort by submittedAt (a valid Application column)
      // When: searchApplications is called with sortBy=submittedAt
      const result = await ApplicationService.searchApplications(
        {},
        { page: 1, limit: 10, sortBy: 'submittedAt', sortOrder: 'DESC' }
      );

      // Then: The query succeeds and returns results
      expect(result.applications).toHaveLength(1);
      expect(MockedApplication.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['submittedAt', 'DESC']],
        })
      );
    });

    it('rejects sorting by an unknown field', async () => {
      // Given: A request with a non-existent sort field
      // When & Then: An error is thrown
      await expect(
        ApplicationService.searchApplications(
          {},
          { page: 1, limit: 10, sortBy: 'notAField', sortOrder: 'DESC' }
        )
      ).rejects.toThrow('Failed to search applications');
    });
  });

  describe('Business Rule: Pet-shape filters (ADS-575)', () => {
    // ADS-575: rescue staff need to narrow the application list by the
    // applied-for pet's type / breed. Both must reach the SQL query so
    // the rendered list actually changes — previously these filters
    // round-tripped through state without affecting the database read.
    const mockApplicationRow = () => {
      const app = createMockApplication();
      return {
        ...app,
        toJSON: vi.fn().mockReturnValue(app),
        Answers: [],
      };
    };

    beforeEach(() => {
      MockedApplication.findAndCountAll = vi.fn().mockResolvedValue({
        rows: [mockApplicationRow()],
        count: 1,
      });
    });

    it('narrows the search by pet type using a case-insensitive match', async () => {
      await ApplicationService.searchApplications({ petType: 'Dog' }, { page: 1, limit: 10 });

      // The Pet.type filter is keyed by Sequelize's $association$ syntax
      // so it reaches the eager-loaded Pet record rather than the
      // Application table directly. Comparing against the canonical
      // `[Op.iLike]: 'Dog'` shape would tie the test to the Sequelize
      // symbol implementation, so we just assert the path is present.
      expect(MockedApplication.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ '$Pet.type$': expect.anything() }),
        })
      );
    });

    it('narrows the search by pet breed using a case-insensitive substring match', async () => {
      await ApplicationService.searchApplications({ petBreed: 'golden' }, { page: 1, limit: 10 });

      // Breed lives on the lookup table eager-loaded via Pet->Breed.
      expect(MockedApplication.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ '$Pet->Breed.name$': expect.anything() }),
        })
      );
    });

    it('omits pet filters from the query when no value is provided', async () => {
      await ApplicationService.searchApplications({}, { page: 1, limit: 10 });

      expect(MockedApplication.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ '$Pet.type$': expect.anything() }),
        })
      );
      expect(MockedApplication.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ '$Pet->Breed.name$': expect.anything() }),
        })
      );
    });
  });

  describe('Business Rule: Rejection Notification (ADS-579)', () => {
    const mockEmailSend = vi.mocked(emailService.sendEmail);
    const mockCreateNotification = vi.mocked(NotificationService.createNotification);

    beforeEach(() => {
      mockEmailSend.mockResolvedValue('email-id-rej');
      mockCreateNotification.mockResolvedValue({} as never);
    });

    it('notifies the applicant by email and in-app when application is rejected', async () => {
      // Given: Application in SUBMITTED status, applicant + pet exist
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);
      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);
      MockedUser.findByPk = vi.fn().mockResolvedValue({
        userId: mockUserId,
        email: 'applicant@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      MockedPet.findByPk = vi.fn().mockResolvedValue({
        petId: mockPetId,
        name: 'Buddy',
      });
      const mockTemplate = { templateId: 'tmpl-rejected' };
      vi.mocked(emailService.getTemplateByName).mockResolvedValue(mockTemplate as never);

      // When: Rescue rejects application with a reason
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.REJECTED,
        rejectionReason: 'Home is not suitable for a large dog',
        actionedBy: 'rescue-staff-123',
      };
      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        'rescue-staff-123'
      );

      // Then: an email was queued to the applicant referencing the pet + reason
      expect(mockEmailSend).toHaveBeenCalledTimes(1);
      const emailArgs = mockEmailSend.mock.calls[0][0];
      expect(emailArgs.toEmail).toBe('applicant@example.com');
      expect(emailArgs.templateId).toBe('tmpl-rejected');
      expect(emailArgs.templateData).toMatchObject({
        applicantName: expect.stringContaining('John'),
        petName: 'Buddy',
        rejectionReason: 'Home is not suitable for a large dog',
      });

      // And: an in-app notification row was created for the applicant
      expect(mockCreateNotification).toHaveBeenCalledTimes(1);
      const notifArgs = mockCreateNotification.mock.calls[0][0];
      expect(notifArgs.userId).toBe(mockUserId);
      expect(notifArgs.type).toBe('adoption_rejected');
    });

    it('does not notify when application is approved (no symmetric send on approval here)', async () => {
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);
      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        { status: ApplicationStatus.APPROVED, actionedBy: 'rescue-staff-123' },
        'rescue-staff-123'
      );

      expect(mockEmailSend).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it('does not fail the status update when the email send throws', async () => {
      // Given: A rejection transition, email service throws
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as vi.Mock).mockReturnValue(true);
      MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication);
      MockedUser.findByPk = vi.fn().mockResolvedValue({
        userId: mockUserId,
        email: 'applicant@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      MockedPet.findByPk = vi.fn().mockResolvedValue({ petId: mockPetId, name: 'Buddy' });
      vi.mocked(emailService.getTemplateByName).mockResolvedValue({
        templateId: 'tmpl-rejected',
      } as never);
      mockEmailSend.mockRejectedValueOnce(new Error('Email provider down'));

      // When & Then: the status update succeeds despite the email failure
      await expect(
        ApplicationService.updateApplicationStatus(
          mockApplicationId,
          {
            status: ApplicationStatus.REJECTED,
            rejectionReason: 'Not a fit',
            actionedBy: 'rescue-staff-123',
          },
          'rescue-staff-123'
        )
      ).resolves.toBeDefined();
      // The transition is still recorded.
      expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({ toStatus: ApplicationStatus.REJECTED })
      );
    });
  });

  describe('Error Handling', () => {
    it('throws error when application not found', async () => {
      // Given: Application does not exist
      MockedApplication.findByPk = vi.fn().mockResolvedValue(null);

      // When & Then: Error is thrown
      await expect(
        ApplicationService.updateApplicationStatus(
          'non-existent-id',
          { status: ApplicationStatus.APPROVED, actionedBy: 'staff-123' },
          'staff-123'
        )
      ).rejects.toThrow('Application not found');
    });

    it('handles database errors gracefully', async () => {
      // Given: Database error occurs
      const mockUser = createMockUser();
      const mockPet = createMockPet();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = vi.fn().mockResolvedValue(null);
      MockedApplication.create = vi.fn().mockRejectedValue(new Error('Database error'));

      // When & Then: Error is propagated
      await expect(ApplicationService.createApplication(request, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });
});
