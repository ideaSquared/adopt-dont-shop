// Mock env config FIRST before any imports
jest.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
}));

import { v4 as uuidv4 } from 'uuid';
import Application, { ApplicationPriority, ApplicationStatus } from '../../models/Application';
import Pet, { PetStatus, PetType, AgeGroup, Gender } from '../../models/Pet';
import User, { UserStatus, UserType } from '../../models/User';
import { ApplicationService } from '../../services/application.service';
import { PetService } from '../../services/pet.service';
import { AuditLogService } from '../../services/auditLog.service';
import ApplicationTimelineService from '../../services/applicationTimeline.service';
import {
  CreateApplicationRequest,
  ApplicationStatusUpdateRequest,
  ReferenceUpdateRequest,
  ApplicationReference,
} from '../../types/application';
import { JsonObject } from '../../types/common';

// Mock dependencies
jest.mock('../../models/Application');
jest.mock('../../models/Pet');
jest.mock('../../models/User');
jest.mock('../../models/ApplicationQuestion');
jest.mock('../../services/auditLog.service');
jest.mock('../../services/applicationTimeline.service');
jest.mock('../../utils/logger');

// Mock email service
jest.mock('../../services/email.service', () => ({
  default: {
    sendEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

const MockedApplication = Application as jest.Mocked<typeof Application>;
const MockedPet = Pet as jest.Mocked<typeof Pet>;
const MockedUser = User as jest.Mocked<typeof User>;
const MockedAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const MockedApplicationTimelineService =
  ApplicationTimelineService as jest.Mocked<typeof ApplicationTimelineService>;

describe('Application Submission Workflow Integration Tests', () => {
  const adopterId = 'adopter-123';
  const rescueStaffId = 'staff-456';
  const petId = 'pet-789';
  const rescueId = 'rescue-abc';
  const applicationId = 'application-xyz';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default audit log mocks
    MockedAuditLogService.log = jest.fn().mockResolvedValue(undefined as never);

    // Setup default timeline mocks
    MockedApplicationTimelineService.createEvent = jest.fn().mockResolvedValue(undefined as never);
  });

  describe('Browse and View Pets', () => {
    describe('when browsing available pets', () => {
      it('should return list of available pets for adoption', async () => {
        const mockPets = [
          createMockPet({ pet_id: 'pet-1', name: 'Buddy', status: PetStatus.AVAILABLE }),
          createMockPet({ pet_id: 'pet-2', name: 'Max', status: PetStatus.AVAILABLE }),
          createMockPet({ pet_id: 'pet-3', name: 'Luna', status: PetStatus.AVAILABLE }),
        ];

        MockedPet.findAndCountAll = jest.fn().mockResolvedValue({
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
          createMockPet({ pet_id: 'dog-1', name: 'Buddy', type: PetType.DOG }),
          createMockPet({ pet_id: 'dog-2', name: 'Max', type: PetType.DOG }),
        ];

        MockedPet.findAndCountAll = jest.fn().mockResolvedValue({
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
          createMockPet({ pet_id: 'pet-1', rescue_id: rescueId }),
          createMockPet({ pet_id: 'pet-2', rescue_id: rescueId }),
        ];

        MockedPet.findAndCountAll = jest.fn().mockResolvedValue({
          rows: mockPets,
          count: 2,
        } as never);

        const result = await PetService.searchPets({ rescueId }, { page: 1, limit: 20 });

        expect(result.pets).toHaveLength(2);
        expect(result.pets[0].rescue_id).toBe(rescueId);
      });

      it('should exclude adopted and pending pets from available listings', async () => {
        const mockAvailablePets = [
          createMockPet({ pet_id: 'pet-1', status: PetStatus.AVAILABLE }),
        ];

        MockedPet.findAndCountAll = jest.fn().mockResolvedValue({
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
          pet_id: petId,
          name: 'Buddy',
          status: PetStatus.AVAILABLE,
          short_description: 'Friendly dog',
          long_description: 'A very friendly and energetic dog',
        });

        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);

        const result = await PetService.getPetById(petId);

        expect(result).toBeDefined();
        expect(result?.pet_id).toBe(petId);
        expect(result?.name).toBe('Buddy');
        expect(result?.short_description).toBe('Friendly dog');
      });

      it('should show adoption requirements and rescue contact information', async () => {
        const mockPet = createMockPet({
          pet_id: petId,
          rescue_id: rescueId,
          status: PetStatus.AVAILABLE,
        });

        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);

        const result = await PetService.getPetById(petId);

        expect(result).toBeDefined();
        expect(result?.rescue_id).toBe(rescueId);
      });

      it('should indicate when a pet is no longer available', async () => {
        const mockPet = createMockPet({
          pet_id: petId,
          status: PetStatus.ADOPTED,
        });

        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);

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
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          pet_id: petId,
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(null);
        MockedApplication.create = jest.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: validAnswers,
          references: validReferences,
        };

        const result = await ApplicationService.createApplication(applicationData, adopterId);

        expect(result).toBeDefined();
        expect(result.user_id).toBe(adopterId);
        expect(result.pet_id).toBe(petId);
        expect(result.status).toBe(ApplicationStatus.SUBMITTED);
        expect(MockedApplication.create).toHaveBeenCalled();
      });

      it('should set default priority to NORMAL when not specified', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          priority: ApplicationPriority.NORMAL,
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(null);
        MockedApplication.create = jest.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: validAnswers,
          references: validReferences,
        };

        const result = await ApplicationService.createApplication(applicationData, adopterId);

        expect(result.priority).toBe(ApplicationPriority.NORMAL);
      });

      it('should initialize references with pending status', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          references: validReferences.map(ref => ({ ...ref, status: 'pending' as const })),
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(null);
        MockedApplication.create = jest.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: validAnswers,
          references: validReferences,
        };

        const result = await ApplicationService.createApplication(applicationData, adopterId);

        expect(result.references).toHaveLength(2);
        expect(result.references[0].status).toBe('pending');
      });

      it('should create timeline event when application is submitted', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          application_id: applicationId,
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(null);
        MockedApplication.create = jest.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
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
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({ application_id: applicationId });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(null);
        MockedApplication.create = jest.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
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
        MockedUser.findByPk = jest.fn().mockResolvedValue(null);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await expect(
          ApplicationService.createApplication(applicationData, adopterId)
        ).rejects.toThrow('User not found');
      });

      it('should reject application for non-existent pet', async () => {
        const mockUser = createMockUser({ userId: adopterId });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(null);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await expect(
          ApplicationService.createApplication(applicationData, adopterId)
        ).rejects.toThrow('Pet not found');
      });

      it('should reject application for unavailable pet', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.ADOPTED });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: validAnswers,
          references: validReferences,
        };

        await expect(
          ApplicationService.createApplication(applicationData, adopterId)
        ).rejects.toThrow('Pet is not available for adoption');
      });

      it('should reject duplicate application for same pet by same user', async () => {
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const existingApplication = createMockApplication({
          user_id: adopterId,
          pet_id: petId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(existingApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
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
            application_id: 'app-1',
            rescue_id: rescueId,
            status: ApplicationStatus.SUBMITTED,
          }),
          createMockApplication({
            application_id: 'app-2',
            rescue_id: rescueId,
            status: ApplicationStatus.SUBMITTED,
          }),
        ];

        MockedApplication.findAndCountAll = jest.fn().mockResolvedValue({
          rows: mockApplications,
          count: 2,
        } as never);

        const result = await ApplicationService.searchApplications(
          { rescue_id: rescueId, status: [ApplicationStatus.SUBMITTED] },
          { page: 1, limit: 20 },
          rescueStaffId,
          UserType.RESCUE_STAFF
        );

        expect(result.applications).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
      });

      it('should display applicant information to rescue staff', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
        });

        MockedApplication.findOne = jest.fn().mockResolvedValue(mockApplication as never);

        const result = await ApplicationService.getApplicationById(
          applicationId,
          rescueStaffId,
          UserType.RESCUE_STAFF
        );

        expect(result).toBeDefined();
        expect(result?.user_id).toBe(adopterId);
      });

      it('should prevent adopters from viewing other adopters applications', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: 'other-adopter-999',
        });

        MockedApplication.findOne = jest.fn().mockResolvedValue(mockApplication as never);

        await expect(
          ApplicationService.getApplicationById(applicationId, adopterId, UserType.ADOPTER)
        ).rejects.toThrow('Access denied');
      });

      it('should allow adopters to view their own applications', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
        });

        MockedApplication.findOne = jest.fn().mockResolvedValue(mockApplication as never);

        const result = await ApplicationService.getApplicationById(
          applicationId,
          adopterId,
          UserType.ADOPTER
        );

        expect(result).toBeDefined();
        expect(result?.user_id).toBe(adopterId);
      });
    });

    describe('when rescue staff updates application status', () => {
      it('should allow status update from SUBMITTED to APPROVED', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actioned_by: rescueStaffId,
        };

        const result = await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ApplicationStatus.APPROVED,
            actioned_by: rescueStaffId,
          })
        );
      });

      it('should allow status update from SUBMITTED to REJECTED with reason', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actioned_by: rescueStaffId,
          rejection_reason: 'Not suitable for high-energy dog',
        };

        const result = await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ApplicationStatus.REJECTED,
            rejection_reason: 'Not suitable for high-energy dog',
          })
        );
      });

      it('should set decision_at timestamp when approving', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actioned_by: rescueStaffId,
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            decision_at: expect.any(Date),
          })
        );
      });

      it('should create timeline event for status update', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actioned_by: rescueStaffId,
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
          application_id: applicationId,
          status: ApplicationStatus.APPROVED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(false);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.SUBMITTED,
          actioned_by: rescueStaffId,
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
        const mockApplication = createMockApplication({
          application_id: applicationId,
          references: [
            {
              id: 'ref-0',
              name: 'John Doe',
              relationship: 'Veterinarian',
              phone: '555-1234',
              status: 'pending',
            },
          ],
        });

        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'contacted',
        };

        const result = await ApplicationService.updateReference(
          applicationId,
          referenceUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalled();
      });

      it('should update reference status to verified after successful check', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          references: [
            {
              id: 'ref-0',
              name: 'John Doe',
              relationship: 'Veterinarian',
              phone: '555-1234',
              status: 'contacted',
            },
          ],
        });

        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'verified',
          notes: 'Confirmed excellent pet owner',
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        expect(mockApplication.update).toHaveBeenCalled();
      });

      it('should update reference status to failed if unreachable', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          references: [
            {
              id: 'ref-0',
              name: 'John Doe',
              relationship: 'Veterinarian',
              phone: '555-1234',
              status: 'contacted',
            },
          ],
        });

        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'failed',
          notes: 'Phone number disconnected',
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        expect(mockApplication.update).toHaveBeenCalled();
      });

      it('should track when reference was contacted', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          references: [
            {
              id: 'ref-0',
              name: 'John Doe',
              relationship: 'Veterinarian',
              phone: '555-1234',
              status: 'pending',
            },
          ],
        });

        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'contacted',
          contacted_at: new Date(),
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        expect(mockApplication.update).toHaveBeenCalled();
      });

      it('should allow adding notes to reference checks', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          references: [
            {
              id: 'ref-0',
              name: 'John Doe',
              relationship: 'Veterinarian',
              phone: '555-1234',
              status: 'contacted',
            },
          ],
        });

        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'verified',
          notes: 'Very positive reference - highly recommended',
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        expect(mockApplication.update).toHaveBeenCalled();
      });
    });
  });

  describe('Home Visit Workflow', () => {
    describe('when scheduling home visits', () => {
      it('should allow rescue staff to add home visit notes', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.updateApplication(
          applicationId,
          { home_visit_notes: 'Scheduled for Saturday 2pm' },
          adopterId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            home_visit_notes: 'Scheduled for Saturday 2pm',
          })
        );
      });

      it('should record home visit completion details', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.updateApplication(
          applicationId,
          {
            home_visit_notes:
              'Visit completed. Home is suitable. Has fenced yard and safe environment.',
          },
          adopterId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            home_visit_notes: expect.stringContaining('Visit completed'),
          })
        );
      });

      it('should allow documenting issues found during home visit', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.updateApplication(
          applicationId,
          {
            home_visit_notes: 'Concerns: No fenced yard. Busy road nearby.',
          },
          adopterId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            home_visit_notes: expect.stringContaining('Concerns'),
          })
        );
      });
    });
  });

  describe('Application Decision', () => {
    describe('when approving applications', () => {
      it('should successfully approve application', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actioned_by: rescueStaffId,
          notes: 'Great fit for our dog!',
        };

        const result = await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ApplicationStatus.APPROVED,
          })
        );
      });

      it('should record who approved the application', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actioned_by: rescueStaffId,
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            actioned_by: rescueStaffId,
          })
        );
      });

      it('should set decision timestamp on approval', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actioned_by: rescueStaffId,
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            decision_at: expect.any(Date),
          })
        );
      });

      it('should create timeline event for approval', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actioned_by: rescueStaffId,
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
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actioned_by: rescueStaffId,
          rejection_reason: 'Not suitable living conditions for this pet',
        };

        const result = await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            rejection_reason: 'Not suitable living conditions for this pet',
          })
        );
      });

      it('should set decision timestamp on rejection', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actioned_by: rescueStaffId,
          rejection_reason: 'Insufficient pet experience',
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            decision_at: expect.any(Date),
          })
        );
      });

      it('should record who rejected the application', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actioned_by: rescueStaffId,
          rejection_reason: 'Does not meet requirements',
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            actioned_by: rescueStaffId,
          })
        );
      });

      it('should create timeline event for rejection', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actioned_by: rescueStaffId,
          rejection_reason: 'Does not meet requirements',
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
          application_id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actioned_by: rescueStaffId,
          rejection_reason: 'Does not meet requirements',
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
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.isInProgress = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const result = await ApplicationService.withdrawApplication(applicationId, adopterId);

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ApplicationStatus.WITHDRAWN,
          })
        );
      });

      it('should prevent withdrawal by non-owner', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        await expect(
          ApplicationService.withdrawApplication(applicationId, 'other-user-999')
        ).rejects.toThrow('Access denied');
      });

      it('should prevent withdrawal of already approved applications', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.APPROVED,
        });

        mockApplication.isInProgress = jest.fn().mockReturnValue(false);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        await expect(
          ApplicationService.withdrawApplication(applicationId, adopterId)
        ).rejects.toThrow('Application cannot be withdrawn in current status');
      });

      it('should prevent withdrawal of already rejected applications', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.REJECTED,
        });

        mockApplication.isInProgress = jest.fn().mockReturnValue(false);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        await expect(
          ApplicationService.withdrawApplication(applicationId, adopterId)
        ).rejects.toThrow('Application cannot be withdrawn in current status');
      });

      it('should record who withdrew the application', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.isInProgress = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.withdrawApplication(applicationId, adopterId);

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            actioned_by: adopterId,
          })
        );
      });

      it('should create timeline event for withdrawal', async () => {
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.isInProgress = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

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
          application_id: applicationId,
          user_id: adopterId,
          status: ApplicationStatus.SUBMITTED,
        });

        mockApplication.isInProgress = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

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
        const mockPets = [createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE })];

        MockedPet.findAndCountAll = jest.fn().mockResolvedValue({
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
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          pet_id: petId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(null);
        MockedApplication.create = jest.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: { livingConditions: { homeType: 'house' } },
          references: [
            { id: 'ref-0', name: 'John Doe', relationship: 'Veterinarian', phone: '555-1234' },
          ],
        };

        const createResult = await ApplicationService.createApplication(
          applicationData,
          adopterId
        );

        expect(createResult.status).toBe(ApplicationStatus.SUBMITTED);

        // Step 3: Approve application
        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actioned_by: rescueStaffId,
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
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          pet_id: petId,
          references: [
            {
              id: 'ref-0',
              name: 'John Doe',
              relationship: 'Veterinarian',
              phone: '555-1234',
              status: 'pending',
            },
          ],
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(null);
        MockedApplication.create = jest.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: { livingConditions: { homeType: 'house' } },
          references: [
            { id: 'ref-0', name: 'John Doe', relationship: 'Veterinarian', phone: '555-1234' },
          ],
        };

        await ApplicationService.createApplication(applicationData, adopterId);

        // Step 2: Check references
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const referenceUpdate: ReferenceUpdateRequest = {
          referenceId: 'ref-0',
          status: 'verified',
        };

        await ApplicationService.updateReference(applicationId, referenceUpdate, rescueStaffId);

        // Step 3: Home visit
        await ApplicationService.updateApplication(
          applicationId,
          { home_visit_notes: 'Excellent home environment' },
          adopterId
        );

        // Step 4: Approve
        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.APPROVED,
          actioned_by: rescueStaffId,
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
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          pet_id: petId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(null);
        MockedApplication.create = jest.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: { livingConditions: { homeType: 'apartment' } },
          references: [
            { id: 'ref-0', name: 'John Doe', relationship: 'Veterinarian', phone: '555-1234' },
          ],
        };

        await ApplicationService.createApplication(applicationData, adopterId);

        // Step 2: Reject application
        mockApplication.canTransitionTo = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        const statusUpdate: ApplicationStatusUpdateRequest = {
          status: ApplicationStatus.REJECTED,
          actioned_by: rescueStaffId,
          rejection_reason: 'Apartment not suitable for large dog',
        };

        await ApplicationService.updateApplicationStatus(
          applicationId,
          statusUpdate,
          rescueStaffId
        );

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ApplicationStatus.REJECTED,
            rejection_reason: 'Apartment not suitable for large dog',
          })
        );
      });
    });

    describe('when following withdrawal path', () => {
      it('should handle full workflow: browse, apply, withdraw', async () => {
        // Step 1: Create application
        const mockUser = createMockUser({ userId: adopterId });
        const mockPet = createMockPet({ pet_id: petId, status: PetStatus.AVAILABLE });
        const mockApplication = createMockApplication({
          application_id: applicationId,
          user_id: adopterId,
          pet_id: petId,
          status: ApplicationStatus.SUBMITTED,
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);
        MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet as never);
        MockedApplication.findOne = jest.fn().mockResolvedValue(null);
        MockedApplication.create = jest.fn().mockResolvedValue(mockApplication as never);

        const applicationData: CreateApplicationRequest = {
          pet_id: petId,
          answers: { livingConditions: { homeType: 'house' } },
          references: [
            { id: 'ref-0', name: 'John Doe', relationship: 'Veterinarian', phone: '555-1234' },
          ],
        };

        await ApplicationService.createApplication(applicationData, adopterId);

        // Step 2: Withdraw application
        mockApplication.isInProgress = jest.fn().mockReturnValue(true);
        mockApplication.update = jest.fn().mockResolvedValue(mockApplication);
        mockApplication.reload = jest.fn().mockResolvedValue(mockApplication);

        MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication as never);

        await ApplicationService.withdrawApplication(applicationId, adopterId);

        expect(mockApplication.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ApplicationStatus.WITHDRAWN,
          })
        );
      });
    });
  });
});

// Helper function to create mock user
function createMockUser(overrides: Partial<User> = {}): jest.Mocked<User> {
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
    toJSON: jest.fn().mockReturnValue({
      userId: overrides.userId ?? 'mock-user-123',
      email: overrides.email ?? 'mock@example.com',
      firstName: overrides.firstName ?? 'Mock',
      lastName: overrides.lastName ?? 'User',
      userType: overrides.userType ?? UserType.ADOPTER,
      status: overrides.status ?? UserStatus.ACTIVE,
    }),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultUser as jest.Mocked<User>;
}

// Helper function to create mock pet
function createMockPet(overrides: Partial<Pet> = {}): jest.Mocked<Pet> {
  const defaultPet = {
    pet_id: 'mock-pet-123',
    name: 'Mock Pet',
    rescue_id: 'rescue-123',
    type: PetType.DOG,
    status: PetStatus.AVAILABLE,
    age_group: AgeGroup.ADULT,
    gender: Gender.MALE,
    short_description: 'A friendly pet',
    long_description: 'A very friendly and loving pet',
    breed: 'Mixed Breed',
    size: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    isAvailable: jest.fn().mockReturnValue(true),
    isAdopted: jest.fn().mockReturnValue(false),
    isPending: jest.fn().mockReturnValue(false),
    increment: jest.fn().mockResolvedValue(undefined),
    toJSON: jest.fn().mockReturnValue({
      pet_id: overrides.pet_id ?? 'mock-pet-123',
      name: overrides.name ?? 'Mock Pet',
      rescue_id: overrides.rescue_id ?? 'rescue-123',
      type: overrides.type ?? PetType.DOG,
      status: overrides.status ?? PetStatus.AVAILABLE,
      age_group: overrides.age_group ?? AgeGroup.ADULT,
      gender: overrides.gender ?? Gender.MALE,
    }),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultPet as unknown as jest.Mocked<Pet>;
}

// Helper function to create mock application
function createMockApplication(overrides: Partial<Application> = {}): jest.Mocked<Application> {
  const defaultApplication = {
    application_id: 'mock-app-123',
    user_id: 'user-123',
    pet_id: 'pet-123',
    rescue_id: 'rescue-123',
    status: ApplicationStatus.SUBMITTED,
    priority: ApplicationPriority.NORMAL,
    answers: {},
    references: [],
    documents: [],
    interview_notes: null,
    home_visit_notes: null,
    score: null,
    tags: [],
    notes: null,
    submitted_at: new Date(),
    reviewed_at: null,
    decision_at: null,
    expires_at: null,
    follow_up_date: null,
    actioned_by: null,
    actioned_at: null,
    rejection_reason: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    canTransitionTo: jest.fn().mockReturnValue(true),
    isInProgress: jest.fn().mockReturnValue(true),
    isPending: jest.fn().mockReturnValue(true),
    requiresAction: jest.fn().mockReturnValue(true),
    getCompletionPercentage: jest.fn().mockReturnValue(25),
    toJSON: jest.fn().mockReturnValue({
      application_id: overrides.application_id ?? 'mock-app-123',
      user_id: overrides.user_id ?? 'user-123',
      pet_id: overrides.pet_id ?? 'pet-123',
      rescue_id: overrides.rescue_id ?? 'rescue-123',
      status: overrides.status ?? ApplicationStatus.SUBMITTED,
      priority: overrides.priority ?? ApplicationPriority.NORMAL,
      answers: overrides.answers ?? {},
      references: overrides.references ?? [],
      documents: overrides.documents ?? [],
    }),
    update: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultApplication as jest.Mocked<Application>;
}
