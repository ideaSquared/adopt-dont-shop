import { vi } from 'vitest';
// Mock env config FIRST before any imports
vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
  getDatabaseName: () => 'test_db',
}));

import Application, { ApplicationPriority, ApplicationStatus } from '../../models/Application';
import ApplicationAnswer from '../../models/ApplicationAnswer';
import ApplicationReferenceModel, {
  ApplicationReferenceStatus,
} from '../../models/ApplicationReference';
import ApplicationStatusTransition from '../../models/ApplicationStatusTransition';
import Pet, { PetStatus, PetType, AgeGroup, Gender } from '../../models/Pet';
import StaffMember from '../../models/StaffMember';
import User, { UserStatus, UserType } from '../../models/User';
import { ApplicationService } from '../../services/application.service';
import { PetService } from '../../services/pet.service';
import { AuditLogService } from '../../services/auditLog.service';
import ApplicationTimelineService from '../../services/applicationTimeline.service';
import {
  CreateApplicationRequest,
  ApplicationStatusUpdateRequest,
  ReferenceUpdateRequest,
} from '../../types/application';
import { JsonObject } from '../../types/common';

// Mock dependencies
vi.mock('../../models/Application');
vi.mock('../../models/ApplicationAnswer');
vi.mock('../../models/ApplicationReference');
vi.mock('../../models/ApplicationStatusTransition');
vi.mock('../../models/Pet');
vi.mock('../../models/StaffMember');
vi.mock('../../models/User');
vi.mock('../../services/auditLog.service');
vi.mock('../../services/applicationTimeline.service');
vi.mock('../../utils/logger');

// Mock email service
vi.mock('../../services/email.service', () => ({
  default: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

const MockedApplication = Application as vi.MockedObject<Application>;
const MockedApplicationAnswer = ApplicationAnswer as vi.MockedObject<typeof ApplicationAnswer>;
const MockedApplicationReference = ApplicationReferenceModel as vi.MockedObject<
  typeof ApplicationReferenceModel
>;
const MockedApplicationStatusTransition = ApplicationStatusTransition as vi.MockedObject<
  typeof ApplicationStatusTransition
>;
const MockedPet = Pet as vi.MockedObject<Pet>;
const MockedStaffMember = StaffMember as vi.MockedObject<typeof StaffMember>;
const MockedUser = User as vi.MockedObject<User>;
const MockedAuditLogService = AuditLogService as vi.MockedObject<AuditLogService>;
const MockedApplicationTimelineService = ApplicationTimelineService as vi.Mocked<
  typeof ApplicationTimelineService
>;

describe('Application Submission Workflow Integration Tests', () => {
  const adopterId = 'adopter-123';
  const rescueStaffId = 'staff-456';
  const petId = 'pet-789';
  const rescueId = 'rescue-abc';
  const applicationId = 'application-xyz';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default audit log mocks
    MockedAuditLogService.log = vi.fn().mockResolvedValue(undefined as never);

    // Setup default timeline mocks
    MockedApplicationTimelineService.createEvent = vi.fn().mockResolvedValue(undefined as never);

    // The status-transition log is a real model. The mocked Application.create
    // returns a fake row that doesn't exist in the DB, so a real transition
    // insert would trip the FK. Stub it — the trigger/hook path has its own
    // dedicated tests.
    MockedApplicationStatusTransition.create = vi.fn().mockResolvedValue({} as never);

    // Application references are written to the application_references
    // table now (plan 2.1). Stub the typed-table writes so the service
    // code doesn't try to hit the real DB through the mocked
    // Application model.
    MockedApplicationReference.bulkCreate = vi.fn().mockResolvedValue([] as never);
    MockedApplicationReference.findAll = vi.fn().mockResolvedValue([] as never);
    MockedApplicationReference.destroy = vi.fn().mockResolvedValue(0 as never);

    // Same reasoning for the application_answers typed table — answers
    // were extracted from JSONB to a typed model in this slice.
    MockedApplicationAnswer.bulkCreate = vi.fn().mockResolvedValue([] as never);
    MockedApplicationAnswer.findAll = vi.fn().mockResolvedValue([] as never);
    MockedApplicationAnswer.destroy = vi.fn().mockResolvedValue(0 as never);
  });

  // Build a minimal ApplicationReference row instance — used by the
  // updateReference flow which calls `target.update(...)` on each
  // row. (plan 2.1)
  const mockReferenceRow = (
    overrides: Partial<{
      reference_id: string;
      legacy_id: string;
      name: string;
      relationship: string;
      phone: string;
      status: 'pending' | 'contacted' | 'verified' | 'failed';
      order_index: number;
    }> = {}
  ) => {
    const row = {
      reference_id: overrides.reference_id ?? 'ref-uuid-0',
      legacy_id: overrides.legacy_id ?? 'ref-0',
      name: overrides.name ?? 'John Doe',
      relationship: overrides.relationship ?? 'Veterinarian',
      phone: overrides.phone ?? '555-1234',
      status: overrides.status ?? 'pending',
      order_index: overrides.order_index ?? 0,
      update: vi.fn().mockResolvedValue(undefined),
      toJSON: vi.fn().mockReturnValue(overrides),
    };
    return row;
  };

  describe('Browse and View Pets', () => {
    describe('when browsing available pets', () => {
      it('should return list of available pets for adoption', async () => {
        const mockPets = [
          createMockPet({ petId: 'pet-1', name: 'Buddy', status: PetStatus.AVAILABLE }),
          createMockPet({ petId: 'pet-2', name: 'Max', status: PetStatus.AVAILABLE }),
          createMockPet({ petId: 'pet-3', name: 'Luna', status: PetStatus.AVAILABLE }),
        ];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockPets,
          count: 3,
        } as never);

        const result = await PetService.searchPets(
          { status: PetStatus.AVAILABLE },
          { page: 1, limit: 20 }
        );

        expect(result.pets).toHaveLength(3);
        expect(result.total).toBe(3);
        expect(MockedPet.findAndCountAll).toHaveBeenCalled();
      });

      it('should filter pets by type when browsing', async () => {
        const mockDogs = [
          createMockPet({ petId: 'dog-1', name: 'Buddy', type: PetType.DOG }),
          createMockPet({ petId: 'dog-2', name: 'Max', type: PetType.DOG }),
        ];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockDogs,
          count: 2,
        } as never);

        const result = await PetService.searchPets(
          { type: PetType.DOG, status: PetStatus.AVAILABLE },
          { page: 1, limit: 20 }
        );

        expect(result.pets).toHaveLength(2);
        expect(result.pets[0].type).toBe(PetType.DOG);
      });

      it('should filter pets by rescue organization', async () => {
        const mockPets = [
          createMockPet({ petId: 'pet-1', rescueId: rescueId }),
          createMockPet({ petId: 'pet-2', rescueId: rescueId }),
        ];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockPets,
          count: 2,
        } as never);

        const result = await PetService.searchPets({ rescueId }, { page: 1, limit: 20 });

        expect(result.pets).toHaveLength(2);
        expect(result.pets[0].rescueId).toBe(rescueId);
      });

      it('should exclude adopted and pending pets from available listings', async () => {
        const mockAvailablePets = [createMockPet({ petId: 'pet-1', status: PetStatus.AVAILABLE })];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockAvailablePets,
          count: 1,
        } as never);

        const result = await PetService.searchPets(
          { status: PetStatus.AVAILABLE },
          { page: 1, limit: 20, includeAdopted: false }
        );

        expect(result.pets).toHaveLength(1);
        expect(result.pets[0].status).toBe(PetStatus.AVAILABLE);
      });
    });

    describe('when viewing pet details', () => {
      it('should display complete pet information for potential adopters', async () => {
        const mockPet = createMockPet({
          petId: petId,
          name: 'Buddy',
          status: PetStatus.AVAILABLE,
          shortDescription: 'Friendly dog',
          longDescription: 'A very friendly and energetic dog',
        });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);

        const result = await PetService.getPetById(petId);

        expect(result).toBeDefined();
        expect(result?.petId).toBe(petId);
        expect(result?.name).toBe('Buddy');
        expect(result?.shortDescription).toBe('Friendly dog');
      });

      it('should show adoption requirements and rescue contact information', async () => {
        const mockPet = createMockPet({
          petId: petId,
          rescueId: rescueId,
          status: PetStatus.AVAILABLE,
        });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);

        const result = await PetService.getPetById(petId);

        expect(result).toBeDefined();
        expect(result?.rescueId).toBe(rescueId);
      });

      it('should indicate when a pet is no longer available', async () => {
        const mockPet = createMockPet({
          petId: petId,
          status: PetStatus.ADOPTED,
        });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);

        const result = await PetService.getPetById(petId);

        expect(result?.status).toBe(PetStatus.ADOPTED);
      });
    });
  });

  describe('Create and Submit Application', () => {
    const validAnswers: JsonObject = {
      livingConditions: { homeType: 'house', hasYard: true },
      petExperience: { previousPets: true },
      householdInfo: { hasChildren: false },
    };

    const validReferences = [
      { id: 'ref-0', name: 'John Doe', relationship: 'Veterinarian', phone: '555-1234' },
      { id: 'ref-1', name: 'Jane Smith', relationship: 'Friend', phone: '555-5678' },
    ];

    describe('when creating a new application', () => {
      it('should successfully create application with valid data', async () => {
        const mockUser = createMockUser({ userId: adopterId, userType: UserType.ADOPTER });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          petId: petId,
        });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(null);
        MockedApplication.create = vi.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: validAnswers,
          references: validReferences,
        };

        const result = await ApplicationService.createApplication(applicationData, adopterId);

        expect(result).toBeDefined();
        expect(result.userId).toBe(adopterId);
        expect(result.petId).toBe(petId);
        expect(result.status).toBe(ApplicationStatus.SUBMITTED);
        expect(MockedApplication.create).toHaveBeenCalled();
      });

      it('should set default priority to NORMAL when not specified', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          priority: ApplicationPriority.NORMAL,
        });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(null);
        MockedApplication.create = vi.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: validAnswers,
          references: validReferences,
        };

        const result = await ApplicationService.createApplication(applicationData, adopterId);

        expect(result.priority).toBe(ApplicationPriority.NORMAL);
      });

      it('should initialize references with pending status', async () => {
        // References live in the application_references typed table now
        // (plan 2.1) — assert the bulkCreate payload rather than the
        // Application model's removed `references` array column.
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication();

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(null);
        MockedApplication.create = vi.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await ApplicationService.createApplication(applicationData, adopterId);

        expect(MockedApplicationReference.bulkCreate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              status: ApplicationReferenceStatus.PENDING,
            }),
          ]),
          expect.objectContaining({ transaction: expect.anything() })
        );
        const payload = (MockedApplicationReference.bulkCreate as vi.Mock).mock.calls[0][0];
        expect(payload).toHaveLength(2);
      });

      it('should create timeline event when application is submitted', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          applicationId: applicationId,
        });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(null);
        MockedApplication.create = vi.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await ApplicationService.createApplication(applicationData, adopterId);

        expect(MockedApplicationTimelineService.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            application_id: applicationId,
            title: 'Application Submitted',
            created_by: adopterId,
          })
        );
      });

      it('should log application creation in audit log', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({ applicationId: applicationId });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(null);
        MockedApplication.create = vi.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await ApplicationService.createApplication(applicationData, adopterId);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CREATE',
            entity: 'Application',
            entityId: applicationId,
            userId: adopterId,
          })
        );
      });

      it('should reject application for non-existent user', async () => {
        MockedUser.findByPk = vi.fn().mockResolvedValue(null);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await expect(
          ApplicationService.createApplication(applicationData, adopterId)
        ).rejects.toThrow('User not found');
      });

      it('should reject application for non-existent pet', async () => {
        const mockUser = createMockUser({ userId: adopterId });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(null);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await expect(
          ApplicationService.createApplication(applicationData, adopterId)
        ).rejects.toThrow('Pet not found');
      });

      it('should reject application for unavailable pet', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.ADOPTED });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await expect(
          ApplicationService.createApplication(applicationData, adopterId)
        ).rejects.toThrow('Pet is not available for adoption');
      });

      it('should reject duplicate application for same pet by same user', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const existingApplication = createMockApplication({
          userId: adopterId,
          petId: petId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(existingApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await expect(
          ApplicationService.createApplication(applicationData, adopterId)
        ).rejects.toThrow('You already have an active application for this pet');
      });
    });
  });

  describe('Application Review Process', () => {
    describe('when rescue staff views applications', () => {
      it('should allow rescue staff to view applications for their rescue', async () => {
        const mockApplications = [
          createMockApplication({
            applicationId: 'app-1',
            rescueId: rescueId,
            status: ApplicationStatus.SUBMITTED,
          }),
          createMockApplication({
            applicationId: 'app-2',
            rescueId: rescueId,
            status: ApplicationStatus.SUBMITTED,
          }),
        ];

        MockedApplication.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockApplications,
          count: 2,
        } as never);

        const result = await ApplicationService.searchApplications(
          { rescueId: rescueId, status: [ApplicationStatus.SUBMITTED] },
          { page: 1, limit: 20 },
          rescueStaffId,
          UserType.RESCUE_STAFF
        );

        expect(result.applications).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
      });

      it('should display applicant information to rescue staff', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          rescueId: rescueId,
        });

        MockedApplication.findOne = vi.fn().mockResolvedValue(mockApplication as never);
        MockedStaffMember.findOne = vi
          .fn()
          .mockResolvedValue({ userId: rescueStaffId, rescueId: rescueId });

        const result = await ApplicationService.getApplicationById(
          applicationId,
          rescueStaffId,
          UserType.RESCUE_STAFF
        );

        expect(result).toBeDefined();
        expect(result?.userId).toBe(adopterId);
      });

      it('should prevent adopters from viewing other adopters applications', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: 'other-adopter-999',
        });

        MockedApplication.findOne = vi.fn().mockResolvedValue(mockApplication as never);

        await expect(
          ApplicationService.getApplicationById(applicationId, adopterId, UserType.ADOPTER)
        ).rejects.toThrow('Access denied');
      });

      it('should allow adopters to view their own applications', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
        });

        MockedApplication.findOne = vi.fn().mockResolvedValue(mockApplication as never);

        const result = await ApplicationService.getApplicationById(
          applicationId,
          adopterId,
          UserType.ADOPTER
        );

        expect(result).toBeDefined();
        expect(result?.userId).toBe(adopterId);
      });
    });

    describe('when rescue staff updates application status', () => {
      it('should allow status update from SUBMITTED to APPROVED', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actionedBy: rescueStaffId,
        };

        const _result = await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            actionedBy: rescueStaffId,
          })
        );
        expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
          expect.objectContaining({
            applicationId,
            toStatus: ApplicationStatus.APPROVED,
            transitionedBy: rescueStaffId,
          })
        );
      });

      it('should allow status update from SUBMITTED to REJECTED with reason', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actionedBy: rescueStaffId,
          rejectionReason: 'Not suitable for high-energy dog',
        };

        const _result = await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            rejectionReason: 'Not suitable for high-energy dog',
          })
        );
        expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
          expect.objectContaining({
            applicationId,
            toStatus: ApplicationStatus.REJECTED,
            reason: 'Not suitable for high-energy dog',
          })
        );
      });

      it('should set decisionAt timestamp when approving', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actionedBy: rescueStaffId,
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            decisionAt: expect.any(Date),
          })
        );
      });

      it('should create timeline event for status update', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actionedBy: rescueStaffId,
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(MockedApplicationTimelineService.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            application_id: applicationId,
            created_by: rescueStaffId,
            new_status: ApplicationStatus.APPROVED,
          })
        );
      });

      it('should reject invalid status transitions', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.APPROVED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(false);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.SUBMITTED,
          actionedBy: rescueStaffId,
        };

        await expect(
          ApplicationService.updateApplicationStatus(applicationId, statusUpdate, rescueStaffId)
        ).rejects.toThrow(/Cannot transition/);
      });
    });
  });

  describe('Reference Checks and Verification', () => {
    describe('when contacting references', () => {
      it('should update reference status to contacted', async () => {
        const mockApplication = createMockApplication({ applicationId: applicationId });
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);
        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const refRow = mockReferenceRow({ status: 'pending' });
        MockedApplicationReference.findAll = vi.fn().mockResolvedValue([refRow] as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'contacted',
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        expect(refRow.update).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'contacted' })
        );
      });

      it('should update reference status to verified after successful check', async () => {
        const mockApplication = createMockApplication({ applicationId: applicationId });
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);
        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const refRow = mockReferenceRow({ status: 'contacted' });
        MockedApplicationReference.findAll = vi.fn().mockResolvedValue([refRow] as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'verified',
          notes: 'Confirmed excellent pet owner',
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        expect(refRow.update).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'verified', notes: 'Confirmed excellent pet owner' })
        );
      });

      it('should update reference status to failed if unreachable', async () => {
        const mockApplication = createMockApplication({ applicationId: applicationId });
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);
        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const refRow = mockReferenceRow({ status: 'contacted' });
        MockedApplicationReference.findAll = vi.fn().mockResolvedValue([refRow] as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'failed',
          notes: 'Phone number disconnected',
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        expect(refRow.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
      });

      it('should track when reference was contacted', async () => {
        const mockApplication = createMockApplication({ applicationId: applicationId });
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);
        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const refRow = mockReferenceRow({ status: 'pending' });
        MockedApplicationReference.findAll = vi.fn().mockResolvedValue([refRow] as never);

        const contactedAt = new Date();
        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'contacted',
          contactedAt,
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        expect(refRow.update).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'contacted', contacted_at: contactedAt })
        );
      });

      it('should allow adding notes to reference checks', async () => {
        const mockApplication = createMockApplication({ applicationId: applicationId });
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);
        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const refRow = mockReferenceRow({ status: 'contacted' });
        MockedApplicationReference.findAll = vi.fn().mockResolvedValue([refRow] as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'verified',
          notes: 'Very positive reference - highly recommended',
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        expect(refRow.update).toHaveBeenCalledWith(
          expect.objectContaining({ notes: 'Very positive reference - highly recommended' })
        );
      });
    });
  });

  describe('Home Visit Workflow', () => {
    describe('when scheduling home visits', () => {
      it('should allow rescue staff to add home visit notes', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.updateApplication(
          applicationId,
          { homeVisitNotes: 'Scheduled for Saturday 2pm' },
          adopterId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            homeVisitNotes: 'Scheduled for Saturday 2pm',
          })
        );
      });

      it('should record home visit completion details', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.updateApplication(
          applicationId,
          {
            homeVisitNotes:
              'Visit completed. Home is suitable. Has fenced yard and safe environment.',
          },
          adopterId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            homeVisitNotes: expect.stringContaining('Visit completed'),
          })
        );
      });

      it('should allow documenting issues found during home visit', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.updateApplication(
          applicationId,
          {
            homeVisitNotes: 'Concerns: No fenced yard. Busy road nearby.',
          },
          adopterId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            homeVisitNotes: expect.stringContaining('Concerns'),
          })
        );
      });
    });
  });

  describe('Application Decision', () => {
    describe('when approving applications', () => {
      it('should successfully approve application', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actionedBy: rescueStaffId,
          notes: 'Great fit for our dog!',
        };

        const _result = await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
          expect.objectContaining({
            applicationId,
            toStatus: ApplicationStatus.APPROVED,
          })
        );
      });

      it('should record who approved the application', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actionedBy: rescueStaffId,
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            actionedBy: rescueStaffId,
          })
        );
      });

      it('should set decision timestamp on approval', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actionedBy: rescueStaffId,
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            decisionAt: expect.any(Date),
          })
        );
      });

      it('should create timeline event for approval', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actionedBy: rescueStaffId,
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(MockedApplicationTimelineService.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            new_status: ApplicationStatus.APPROVED,
          })
        );
      });
    });

    describe('when rejecting applications', () => {
      it('should require rejection reason when rejecting', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actionedBy: rescueStaffId,
          rejectionReason: 'Not suitable living conditions for this pet',
        };

        const _result = await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            rejectionReason: 'Not suitable living conditions for this pet',
          })
        );
      });

      it('should set decision timestamp on rejection', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actionedBy: rescueStaffId,
          rejectionReason: 'Insufficient pet experience',
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            decisionAt: expect.any(Date),
          })
        );
      });

      it('should record who rejected the application', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actionedBy: rescueStaffId,
          rejectionReason: 'Does not meet requirements',
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            actionedBy: rescueStaffId,
          })
        );
      });

      it('should create timeline event for rejection', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actionedBy: rescueStaffId,
          rejectionReason: 'Does not meet requirements',
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(MockedApplicationTimelineService.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            new_status: ApplicationStatus.REJECTED,
          })
        );
      });

      it('should log rejection in audit trail', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actionedBy: rescueStaffId,
          rejectionReason: 'Does not meet requirements',
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'APPLICATION_STATUS_UPDATED',
            entity: 'Application',
          })
        );
      });
    });
  });

  describe('Application Withdrawal', () => {
    describe('when applicant withdraws application', () => {
      it('should allow applicant to withdraw their own application', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.isInProgress = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const _result = await ApplicationService.withdrawApplication(applicationId, adopterId);

        expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
          expect.objectContaining({
            applicationId,
            toStatus: ApplicationStatus.WITHDRAWN,
            transitionedBy: adopterId,
          })
        );
      });

      it('should prevent withdrawal by non-owner', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await expect(
          ApplicationService.withdrawApplication(applicationId, 'other-user-999')
        ).rejects.toThrow('Access denied');
      });

      it('should prevent withdrawal of already approved applications', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.APPROVED,
        });

        mockApplication.isInProgress = vi.fn().mockReturnValue(false);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await expect(
          ApplicationService.withdrawApplication(applicationId, adopterId)
        ).rejects.toThrow('Application cannot be withdrawn in current status');
      });

      it('should prevent withdrawal of already rejected applications', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.REJECTED,
        });

        mockApplication.isInProgress = vi.fn().mockReturnValue(false);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await expect(
          ApplicationService.withdrawApplication(applicationId, adopterId)
        ).rejects.toThrow('Application cannot be withdrawn in current status');
      });

      it('should record who withdrew the application', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.isInProgress = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.withdrawApplication(applicationId, adopterId);

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            actionedBy: adopterId,
          })
        );
      });

      it('should create timeline event for withdrawal', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.isInProgress = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.withdrawApplication(applicationId, adopterId);

        expect(MockedApplicationTimelineService.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Application Withdrawn',
            new_status: ApplicationStatus.WITHDRAWN,
          })
        );
      });

      it('should log withdrawal in audit trail', async () => {
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.isInProgress = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.withdrawApplication(applicationId, adopterId);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'WITHDRAW',
            entity: 'Application',
            userId: adopterId,
          })
        );
      });
    });
  });

  describe('Complete Application Lifecycle', () => {
    describe('when following complete successful adoption path', () => {
      it('should handle full workflow: browse, apply, review, approve', async () => {
        // Step 1: Browse pets
        const mockPets = [createMockPet({ petId: petId, status: PetStatus.AVAILABLE })];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockPets,
          count: 1,
        } as never);

        const browseResult = await PetService.searchPets(
          { status: PetStatus.AVAILABLE },
          { page: 1, limit: 20 }
        );

        expect(browseResult.pets).toHaveLength(1);

        // Step 2: Create application
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          petId: petId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(null);
        MockedApplication.create = vi.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: { livingConditions: { homeType: 'house' } },
          references: [
            { id: 'ref-0', name: 'John Doe', relationship: 'Veterinarian', phone: '555-1234' },
          ],
        };

        const createResult = await ApplicationService.createApplication(applicationData, adopterId);

        expect(createResult.status).toBe(ApplicationStatus.SUBMITTED);

        // Step 3: Approve application
        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actionedBy: rescueStaffId,
        };

        const approveResult = await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(MockedApplicationTimelineService.createEvent).toHaveBeenCalledTimes(2);
        expect(MockedAuditLogService.log).toHaveBeenCalledTimes(2);
      });

      it('should handle full workflow: browse, apply, check references, home visit, approve', async () => {
        // Step 1: Create application
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          petId: petId,
        });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(null);
        MockedApplication.create = vi.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: { livingConditions: { homeType: 'house' } },
          references: [
            { id: 'ref-0', name: 'John Doe', relationship: 'Veterinarian', phone: '555-1234' },
          ],
        };

        await ApplicationService.createApplication(applicationData, adopterId);

        // Step 2: Check references
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const refRow = mockReferenceRow({ status: 'pending' });
        MockedApplicationReference.findAll = vi.fn().mockResolvedValue([refRow] as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'verified',
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        // Step 3: Home visit
        await ApplicationService.updateApplication(
          applicationId,
          { homeVisitNotes: 'Excellent home environment' },
          adopterId
        );

        // Step 4: Approve
        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actionedBy: rescueStaffId,
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalled();
      });
    });

    describe('when following rejection path', () => {
      it('should handle full workflow: browse, apply, review, reject', async () => {
        // Step 1: Create application
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          petId: petId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(null);
        MockedApplication.create = vi.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: { livingConditions: { homeType: 'apartment' } },
          references: [
            { id: 'ref-0', name: 'John Doe', relationship: 'Veterinarian', phone: '555-1234' },
          ],
        };

        await ApplicationService.createApplication(applicationData, adopterId);

        // Step 2: Reject application
        mockApplication.canTransitionTo = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actionedBy: rescueStaffId,
          rejectionReason: 'Apartment not suitable for large dog',
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
          expect.objectContaining({
            applicationId,
            toStatus: ApplicationStatus.REJECTED,
            reason: 'Apartment not suitable for large dog',
          })
        );
      });
    });

    describe('when following withdrawal path', () => {
      it('should handle full workflow: browse, apply, withdraw', async () => {
        // Step 1: Create application
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ petId: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          applicationId: applicationId,
          userId: adopterId,
          petId: petId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = vi.fn().mockResolvedValue(null);
        MockedApplication.create = vi.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          petId: petId,
          answers: { livingConditions: { homeType: 'house' } },
          references: [
            { id: 'ref-0', name: 'John Doe', relationship: 'Veterinarian', phone: '555-1234' },
          ],
        };

        await ApplicationService.createApplication(applicationData, adopterId);

        // Step 2: Withdraw application
        mockApplication.isInProgress = vi.fn().mockReturnValue(true);
        mockApplication.update = vi.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = vi.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = vi.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.withdrawApplication(applicationId, adopterId);

        expect(MockedApplicationStatusTransition.create).toHaveBeenCalledWith(
          expect.objectContaining({
            applicationId,
            toStatus: ApplicationStatus.WITHDRAWN,
            transitionedBy: adopterId,
          })
        );
      });
    });
  });
});

// Helper function to create mock user
function createMockUser(overrides: Partial<User> = {}): vi.Mocked<User> {
  const defaultUser = {
    userId: 'mock-user-123',
    email: 'mock@example.com',
    firstName: 'Mock',
    lastName: 'User',
    password: 'hashed_password',
    emailVerified: true,
    status: UserStatus.ACTIVE,
    userType: UserType.ADOPTER,
    loginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    toJSON: vi.fn().mockReturnValue({
      userId: overrides.userId ?? 'mock-user-123',
      email: overrides.email ?? 'mock@example.com',
      firstName: overrides.firstName ?? 'Mock',
      lastName: overrides.lastName ?? 'User',
      userType: overrides.userType ?? UserType.ADOPTER,
      status: overrides.status ?? UserStatus.ACTIVE,
    }),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultUser as vi.Mocked<User>;
}

// Helper function to create mock pet
function createMockPet(overrides: Partial<Pet> = {}): vi.Mocked<Pet> {
  const defaultPet = {
    petId: 'mock-pet-123',
    name: 'Mock Pet',
    rescueId: 'rescue-123',
    type: PetType.DOG,
    status: PetStatus.AVAILABLE,
    ageGroup: AgeGroup.ADULT,
    gender: Gender.MALE,
    shortDescription: 'A friendly pet',
    longDescription: 'A very friendly and loving pet',
    breed: 'Mixed Breed',
    size: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    isAvailable: vi.fn().mockReturnValue(true),
    isAdopted: vi.fn().mockReturnValue(false),
    isPending: vi.fn().mockReturnValue(false),
    increment: vi.fn().mockResolvedValue(undefined),
    toJSON: vi.fn().mockReturnValue({
      petId: overrides.petId ?? 'mock-pet-123',
      name: overrides.name ?? 'Mock Pet',
      rescueId: overrides.rescueId ?? 'rescue-123',
      type: overrides.type ?? PetType.DOG,
      status: overrides.status ?? PetStatus.AVAILABLE,
      ageGroup: overrides.ageGroup ?? AgeGroup.ADULT,
      gender: overrides.gender ?? Gender.MALE,
    }),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultPet as unknown as vi.Mocked<Pet>;
}

// Helper function to create mock application
function createMockApplication(overrides: Partial<Application> = {}): vi.Mocked<Application> {
  const defaultApplication = {
    applicationId: 'mock-app-123',
    userId: 'user-123',
    petId: 'pet-123',
    rescueId: 'rescue-123',
    status: ApplicationStatus.SUBMITTED,
    priority: ApplicationPriority.NORMAL,
    // answers moved to application_answers (plan 2.1) — no longer a
    // column on Application; the test mocks the model directly where
    // assertions are needed.
    // references[] moved to application_references (plan 2.1) — no
    // longer a column on Application; the test mocks the model directly
    // where assertions are needed.
    documents: [],
    interviewNotes: null,
    homeVisitNotes: null,
    score: null,
    tags: [],
    notes: null,
    submittedAt: new Date(),
    reviewedAt: null,
    decisionAt: null,
    expiresAt: null,
    followUpDate: null,
    actionedBy: null,
    actionedAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    canTransitionTo: vi.fn().mockReturnValue(true),
    isInProgress: vi.fn().mockReturnValue(true),
    isPending: vi.fn().mockReturnValue(true),
    requiresAction: vi.fn().mockReturnValue(true),
    getCompletionPercentage: vi.fn().mockReturnValue(25),
    toJSON: vi.fn().mockReturnValue({
      applicationId: overrides.applicationId ?? 'mock-app-123',
      userId: overrides.userId ?? 'user-123',
      petId: overrides.petId ?? 'pet-123',
      rescueId: overrides.rescueId ?? 'rescue-123',
      status: overrides.status ?? ApplicationStatus.SUBMITTED,
      priority: overrides.priority ?? ApplicationPriority.NORMAL,
      documents: overrides.documents ?? [],
    }),
    update: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultApplication as vi.Mocked<Application>;
}
