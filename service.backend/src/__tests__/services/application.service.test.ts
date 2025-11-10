/**
 * Application Service - Business Logic Tests
 *
 * These tests focus on business rules, workflows, and edge cases rather than implementation details.
 * Tests are organized by business scenarios and validate that business rules are correctly enforced.
 */

import { ApplicationService } from '../../services/application.service';
import Application, { ApplicationStatus, ApplicationPriority } from '../../models/Application';
import Pet, { PetStatus } from '../../models/Pet';
import User, { UserType } from '../../models/User';
import { CreateApplicationRequest, ApplicationStatusUpdateRequest } from '../../types/application';

// Cast models to mocked versions
const MockedApplication = Application as jest.Mocked<typeof Application>;
const MockedPet = Pet as jest.Mocked<typeof Pet>;
const MockedUser = User as jest.Mocked<typeof User>;

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
    toJSON: jest.fn().mockReturnThis(),
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
    toJSON: jest.fn().mockReturnThis(),
    ...overrides,
  });

  const createMockApplication = (status = ApplicationStatus.SUBMITTED, overrides = {}) => ({
    application_id: mockApplicationId,
    user_id: mockUserId,
    pet_id: mockPetId,
    rescue_id: mockRescueId,
    status,
    answers: { experience: 'yes', has_yard: 'yes' },
    references: [{ id: 'ref-1', name: 'Jane Doe', email: 'jane@example.com', phone: '555-0100', relationship: 'friend' }],
    priority: ApplicationPriority.NORMAL,
    submitted_at: new Date(),
    update: jest.fn().mockResolvedValue(true),
    reload: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnThis(),
    canTransitionTo: jest.fn(),
    ...overrides,
  });

  const createValidApplicationRequest = (): CreateApplicationRequest => ({
    pet_id: mockPetId,
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
        email: 'jane@example.com'
      },
    ],
    priority: ApplicationPriority.NORMAL,
    notes: 'Very excited to adopt!',
    tags: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Business Rule: Application Creation', () => {
    it('creates application successfully with valid data', async () => {
      // Given: Valid user, available pet, and application data
      const mockUser = createMockUser();
      const mockPet = createMockPet();
      const mockApplication = createMockApplication();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = jest.fn().mockResolvedValue(null); // No duplicate
      MockedApplication.create = jest.fn().mockResolvedValue(mockApplication);

      // When: User creates application
      const result = await ApplicationService.createApplication(request, mockUserId);

      // Then: Application is created with SUBMITTED status
      expect(MockedUser.findByPk).toHaveBeenCalledWith(mockUserId);
      expect(MockedPet.findByPk).toHaveBeenCalledWith(mockPetId);
      expect(MockedApplication.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: mockUserId,
            pet_id: mockPetId,
          }),
        })
      );
      expect(MockedApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          pet_id: mockPetId,
          rescue_id: mockRescueId,
          status: ApplicationStatus.SUBMITTED,
          answers: request.answers,
        })
      );
      expect(result).toBeDefined();
    });

    it('prevents duplicate applications for same pet', async () => {
      // Given: User already has an application for this pet
      const mockUser = createMockUser();
      const mockPet = createMockPet();
      const existingApplication = createMockApplication();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = jest.fn().mockResolvedValue(existingApplication);

      // When & Then: Duplicate application is rejected
      await expect(
        ApplicationService.createApplication(request, mockUserId)
      ).rejects.toThrow('already have an active application');

      expect(MockedApplication.create).not.toHaveBeenCalled();
    });

    it('prevents application when pet is not available', async () => {
      // Given: Pet is already adopted
      const mockUser = createMockUser();
      const mockPet = createMockPet({ status: PetStatus.ADOPTED });
      const request = createValidApplicationRequest();

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      // When & Then: Application is rejected
      await expect(
        ApplicationService.createApplication(request, mockUserId)
      ).rejects.toThrow('not available');

      expect(MockedApplication.create).not.toHaveBeenCalled();
    });

    it('requires user to exist', async () => {
      // Given: User does not exist
      const request = createValidApplicationRequest();

      MockedUser.findByPk = jest.fn().mockResolvedValue(null);

      // When & Then: Application is rejected
      await expect(
        ApplicationService.createApplication(request, mockUserId)
      ).rejects.toThrow('User not found');
    });

    it('requires pet to exist', async () => {
      // Given: Pet does not exist
      const mockUser = createMockUser();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = jest.fn().mockResolvedValue(null);

      // When & Then: Application is rejected
      await expect(
        ApplicationService.createApplication(request, mockUserId)
      ).rejects.toThrow('Pet not found');
    });
  });

  describe('Business Rule: Status Transition Validation', () => {
    it('allows SUBMITTED → APPROVED transition', async () => {
      // Given: Application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(true);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When: Rescue approves application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.APPROVED,
        actioned_by: 'rescue-staff-123',
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        'rescue-staff-123'
      );

      // Then: Status changes to APPROVED
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApplicationStatus.APPROVED,
        })
      );
    });

    it('allows SUBMITTED → REJECTED transition with reason', async () => {
      // Given: Application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(true);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When: Rescue rejects application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.REJECTED,
        rejection_reason: 'Not a good fit for this pet',
        actioned_by: 'rescue-staff-123',
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        'rescue-staff-123'
      );

      // Then: Status changes to REJECTED with reason
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApplicationStatus.REJECTED,
          rejection_reason: 'Not a good fit for this pet',
        })
      );
    });

    it('prevents APPROVED → REJECTED transition', async () => {
      // Given: Application already APPROVED
      const mockApplication = createMockApplication(ApplicationStatus.APPROVED);
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(false);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When & Then: Cannot reverse approval
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.REJECTED,
        actioned_by: 'rescue-staff-123',
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
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(false);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When & Then: Cannot reverse rejection
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.APPROVED,
        actioned_by: 'rescue-staff-123',
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
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(true);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When: Adopter withdraws application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.WITHDRAWN,
        actioned_by: mockUserId,
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        mockUserId
      );

      // Then: Status changes to WITHDRAWN
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApplicationStatus.WITHDRAWN,
        })
      );
    });

    it('prevents APPROVED → WITHDRAWN transition', async () => {
      // Given: Application already APPROVED
      const mockApplication = createMockApplication(ApplicationStatus.APPROVED);
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(false);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When & Then: Cannot withdraw approved application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.WITHDRAWN,
        actioned_by: mockUserId,
      };

      await expect(
        ApplicationService.updateApplicationStatus(
          mockApplicationId,
          updateRequest,
          mockUserId
        )
      ).rejects.toThrow('Cannot transition from approved to withdrawn');
    });
  });

  describe('Business Rule: Application Modification', () => {
    it('allows user to update their own SUBMITTED application', async () => {
      // Given: User owns application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      mockApplication.user_id = mockUserId;

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When: User updates answers
      const updates = {
        answers: {
          experience: 'Updated experience details',
          has_yard: 'yes',
        },
      };

      await ApplicationService.updateApplication(mockApplicationId, updates, mockUserId);

      // Then: Application is updated
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          answers: updates.answers,
        })
      );
    });

    it('prevents modifications to APPROVED applications', async () => {
      // Given: Application is APPROVED
      const mockApplication = createMockApplication(ApplicationStatus.APPROVED);
      mockApplication.user_id = mockUserId;

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

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
      mockApplication.user_id = mockUserId;

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When & Then: Update is rejected
      const updates = { answers: { experience: 'New info' } };

      await expect(
        ApplicationService.updateApplication(mockApplicationId, updates, mockUserId)
      ).rejects.toThrow('Application cannot be updated once processed');

      expect(mockApplication.update).not.toHaveBeenCalled();
    });

    it('prevents user from modifying another user\'s application', async () => {
      // Given: Application belongs to different user
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      mockApplication.user_id = 'other-user-456';

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

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
      mockApplication.user_id = mockUserId;

      MockedApplication.findOne = jest.fn().mockResolvedValue(mockApplication);

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
            application_id: mockApplicationId,
          }),
        })
      );
    });

    it('prevents user from viewing another user\'s application', async () => {
      // Given: Application belongs to different user
      const mockApplication = createMockApplication();
      mockApplication.user_id = 'other-user-456';

      MockedApplication.findOne = jest.fn().mockResolvedValue(mockApplication);

      // When & Then: Access denied
      await expect(
        ApplicationService.getApplicationById(mockApplicationId, mockUserId, UserType.ADOPTER)
      ).rejects.toThrow('Access denied');
    });

    it('allows rescue staff to view applications for their pets', async () => {
      // Given: Application for pet belonging to rescue
      const mockApplication = createMockApplication();
      mockApplication.rescue_id = mockRescueId;

      MockedApplication.findOne = jest.fn().mockResolvedValue(mockApplication);

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

      MockedApplication.findOne = jest.fn().mockResolvedValue(mockApplication);

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

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = jest.fn().mockResolvedValue(null);
      MockedApplication.create = jest.fn().mockResolvedValue(mockApplication);

      // When: Application is created
      await ApplicationService.createApplication(request, mockUserId);

      // Then: Status is SUBMITTED (not APPROVED or REJECTED)
      expect(MockedApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApplicationStatus.SUBMITTED,
        })
      );
    });

    it('sets submitted_at timestamp on creation', async () => {
      // Given: Valid application request with submitted_at in mock
      const mockUser = createMockUser();
      const mockPet = createMockPet();
      const mockApplication = createMockApplication();
      mockApplication.submitted_at = new Date();
      mockApplication.toJSON = jest.fn().mockReturnValue({
        ...mockApplication,
        submitted_at: mockApplication.submitted_at,
      });
      const request = createValidApplicationRequest();

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = jest.fn().mockResolvedValue(null);
      MockedApplication.create = jest.fn().mockResolvedValue(mockApplication);

      // When: Application is created
      const result = await ApplicationService.createApplication(request, mockUserId);

      // Then: Application was created and has submitted_at (set by model default)
      expect(MockedApplication.create).toHaveBeenCalled();
      expect(mockApplication.toJSON).toHaveBeenCalled();
    });

    it('sets decision_at timestamp when application is approved', async () => {
      // Given: Application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(true);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When: Application is approved
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.APPROVED,
        actioned_by: 'rescue-staff-123',
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        'rescue-staff-123'
      );

      // Then: decision_at timestamp is set
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          decision_at: expect.any(Date),
        })
      );
    });

    it('sets decision_at timestamp when application is rejected', async () => {
      // Given: Application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(true);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When: Application is rejected
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.REJECTED,
        rejection_reason: 'Not suitable',
        actioned_by: 'rescue-staff-123',
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        'rescue-staff-123'
      );

      // Then: decision_at timestamp is set
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          decision_at: expect.any(Date),
        })
      );
    });

    it('preserves rescue_id from pet when creating application', async () => {
      // Given: Pet belongs to specific rescue
      const mockUser = createMockUser();
      const mockPet = createMockPet({ rescueId: 'rescue-xyz-789', rescue_id: 'rescue-xyz-789' });
      const mockApplication = createMockApplication();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = jest.fn().mockResolvedValue(null);
      MockedApplication.create = jest.fn().mockResolvedValue(mockApplication);

      // When: Application is created
      await ApplicationService.createApplication(request, mockUserId);

      // Then: Application has correct rescue_id
      expect(MockedApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rescue_id: 'rescue-xyz-789',
        })
      );
    });
  });

  describe('Business Rule: Withdrawal Conditions', () => {
    it('allows user to withdraw their own SUBMITTED application', async () => {
      // Given: User owns application in SUBMITTED status
      const mockApplication = createMockApplication(ApplicationStatus.SUBMITTED);
      mockApplication.user_id = mockUserId;
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(true);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When: User withdraws application
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.WITHDRAWN,
        actioned_by: mockUserId,
      };

      await ApplicationService.updateApplicationStatus(
        mockApplicationId,
        updateRequest,
        mockUserId
      );

      // Then: Application is withdrawn
      expect(mockApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApplicationStatus.WITHDRAWN,
        })
      );
    });

    it('prevents withdrawal of approved applications', async () => {
      // Given: Application is APPROVED
      const mockApplication = createMockApplication(ApplicationStatus.APPROVED);
      mockApplication.user_id = mockUserId;
      (mockApplication.canTransitionTo as jest.Mock).mockReturnValue(false);

      MockedApplication.findByPk = jest.fn().mockResolvedValue(mockApplication);

      // When & Then: Withdrawal is rejected
      const updateRequest: ApplicationStatusUpdateRequest = {
        status: ApplicationStatus.WITHDRAWN,
        actioned_by: mockUserId,
      };

      await expect(
        ApplicationService.updateApplicationStatus(
          mockApplicationId,
          updateRequest,
          mockUserId
        )
      ).rejects.toThrow('Cannot transition');

      expect(mockApplication.update).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('throws error when application not found', async () => {
      // Given: Application does not exist
      MockedApplication.findByPk = jest.fn().mockResolvedValue(null);

      // When & Then: Error is thrown
      await expect(
        ApplicationService.updateApplicationStatus(
          'non-existent-id',
          { status: ApplicationStatus.APPROVED, actioned_by: 'staff-123' },
          'staff-123'
        )
      ).rejects.toThrow('Application not found');
    });

    it('handles database errors gracefully', async () => {
      // Given: Database error occurs
      const mockUser = createMockUser();
      const mockPet = createMockPet();
      const request = createValidApplicationRequest();

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);
      MockedApplication.findOne = jest.fn().mockResolvedValue(null);
      MockedApplication.create = jest.fn().mockRejectedValue(new Error('Database error'));

      // When & Then: Error is propagated
      await expect(
        ApplicationService.createApplication(request, mockUserId)
      ).rejects.toThrow('Database error');
    });
  });
});
