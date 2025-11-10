// Mock config first
jest.mock('../../config', () => ({
  config: {
    storage: {
      local: {
        maxFileSize: 10485760, // 10MB
        directory: '/tmp/uploads',
      },
    },
  },
}));

// Mock sequelize before models
jest.mock('../../sequelize', () => ({
  __esModule: true,
  default: {
    define: jest.fn(),
    model: jest.fn(),
    models: {},
  },
}));

// Mock dependencies before imports
jest.mock('../../services/application.service');
jest.mock('../../models/User');

// Mock HomeVisit model completely to prevent initialization
jest.mock('../../models/HomeVisit', () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  HomeVisitStatus: {
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    RESCHEDULED: 'rescheduled',
  },
}));

// Mock Application model
jest.mock('../../models/Application', () => ({
  __esModule: true,
  default: {
    update: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  ApplicationStatus: {
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
  },
  ApplicationPriority: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
  },
}));

const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  end: jest.fn(),
  log: jest.fn(),
};

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: loggerMock,
  logger: loggerMock,
  loggerHelpers: {
    logRequest: jest.fn(),
    logBusiness: jest.fn(),
    logAuth: jest.fn(),
    logSecurity: jest.fn(),
  },
}));

import { Response } from 'express';
import { ApplicationController } from '../../controllers/application.controller';
import { ApplicationService } from '../../services/application.service';
import HomeVisit, { HomeVisitStatus } from '../../models/HomeVisit';
import Application, { ApplicationPriority, ApplicationStatus } from '../../models/Application';
import { UserType } from '../../models/User';
import { AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';

describe('ApplicationController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let applicationController: ApplicationController;

  beforeEach(() => {
    mockRequest = {
      user: {
        userId: 'user-123',
        userType: UserType.ADOPTER,
      } as any,
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    applicationController = new ApplicationController();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getApplications - Retrieve applications with filtering', () => {
    describe('when retrieving applications successfully', () => {
      it('should return paginated applications', async () => {
        const mockApplications = [
          {
            application_id: 'app-001',
            user_id: 'user-123',
            pet_id: 'pet-456',
            rescue_id: 'rescue-789',
            status: ApplicationStatus.SUBMITTED,
            answers: { housing_type: 'house' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            User: {
              userId: 'user-123',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
            },
            Pet: {
              name: 'Buddy',
              type: 'dog',
              breed: 'Golden Retriever',
            },
          },
        ];

        const mockResult = {
          applications: mockApplications,
          total_filtered: 1,
          pagination: {
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        };

        (ApplicationService.searchApplications as jest.Mock).mockResolvedValue(mockResult);

        await applicationController.getApplications(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ApplicationService.searchApplications).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            page: 1,
            limit: 20,
            sortBy: 'created_at',
            sortOrder: 'DESC',
          }),
          'user-123',
          UserType.ADOPTER
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.any(Array),
            meta: expect.objectContaining({
              total: 1,
              page: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            }),
          })
        );
      });

      it('should apply filters from query parameters', async () => {
        mockRequest.query = {
          status: ApplicationStatus.APPROVED,
          pet_id: 'pet-456',
          page: '2',
          limit: '10',
        };

        const mockResult = {
          applications: [],
          total_filtered: 0,
          pagination: { page: 2, limit: 10, totalPages: 0 },
        };

        (ApplicationService.searchApplications as jest.Mock).mockResolvedValue(mockResult);

        await applicationController.getApplications(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ApplicationService.searchApplications).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ApplicationStatus.APPROVED,
            pet_id: 'pet-456',
          }),
          expect.objectContaining({
            page: 2,
            limit: 10,
          }),
          'user-123',
          UserType.ADOPTER
        );
      });
    });

    describe('when search fails', () => {
      it('should return 500 error', async () => {
        (ApplicationService.searchApplications as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await applicationController.getApplications(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to retrieve applications',
          })
        );
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('createApplication - Create new application', () => {
    describe('when creating with valid data', () => {
      it('should create application and return 201 status', async () => {
        const applicationData = {
          pet_id: 'pet-456',
          answers: { housing_type: 'house' },
          references: [
            {
              name: 'Jane Smith',
              relationship: 'Friend',
              phone: '+1234567890',
              email: 'jane@example.com',
            },
          ],
          priority: ApplicationPriority.NORMAL,
        };

        mockRequest.body = applicationData;

        const mockApplication = {
          application_id: 'app-001',
          user_id: 'user-123',
          pet_id: 'pet-456',
          status: ApplicationStatus.SUBMITTED,
          created_at: new Date().toISOString(),
        };

        (ApplicationService.createApplication as jest.Mock).mockResolvedValue(mockApplication);

        await applicationController.createApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Application created successfully',
            data: mockApplication,
          })
        );
      });

      it('should pass user ID to service', async () => {
        mockRequest.body = {
          pet_id: 'pet-456',
          answers: {},
          references: [{ name: 'Test', relationship: 'Friend', phone: '+1234567890' }],
        };

        const mockApplication = { application_id: 'app-001' };
        (ApplicationService.createApplication as jest.Mock).mockResolvedValue(mockApplication);

        await applicationController.createApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ApplicationService.createApplication).toHaveBeenCalledWith(
          expect.objectContaining({
            pet_id: 'pet-456',
            answers: {},
            references: expect.any(Array),
          }),
          'user-123'
        );
      });
    });

    describe('when pet not found', () => {
      it('should return 404 error', async () => {
        mockRequest.body = {
          pet_id: 'nonexistent',
          answers: {},
          references: [{ name: 'Test', relationship: 'Friend', phone: '+1234567890' }],
        };

        (ApplicationService.createApplication as jest.Mock).mockRejectedValue(
          new Error('Pet not found')
        );

        await applicationController.createApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Pet not found',
          })
        );
      });
    });

    describe('when user already has active application', () => {
      it('should return 409 conflict error', async () => {
        mockRequest.body = {
          pet_id: 'pet-456',
          answers: {},
          references: [{ name: 'Test', relationship: 'Friend', phone: '+1234567890' }],
        };

        (ApplicationService.createApplication as jest.Mock).mockRejectedValue(
          new Error('You already have an active application for this pet')
        );

        await applicationController.createApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'You already have an active application for this pet',
          })
        );
      });
    });

    describe('when pet is not available', () => {
      it('should return 409 conflict error', async () => {
        mockRequest.body = {
          pet_id: 'pet-456',
          answers: {},
          references: [{ name: 'Test', relationship: 'Friend', phone: '+1234567890' }],
        };

        (ApplicationService.createApplication as jest.Mock).mockRejectedValue(
          new Error('Pet is not available for adoption')
        );

        await applicationController.createApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Pet is not available for adoption',
          })
        );
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error', async () => {
        mockRequest.body = {
          pet_id: 'pet-456',
          answers: {},
          references: [],
        };

        (ApplicationService.createApplication as jest.Mock).mockRejectedValue(
          new Error('Application validation failed: Missing required field')
        );

        await applicationController.createApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });
    });
  });

  describe('getApplicationById - Retrieve specific application', () => {
    describe('when application exists and user has access', () => {
      it('should return application data', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        const mockApplication = {
          application_id: 'app-001',
          user_id: 'user-123',
          pet_id: 'pet-456',
          rescue_id: 'rescue-789',
          status: ApplicationStatus.SUBMITTED,
          answers: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          User: {
            userId: 'user-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
          },
          Pet: {
            name: 'Buddy',
            type: 'dog',
            breed: 'Golden Retriever',
          },
        };

        (ApplicationService.getApplicationById as jest.Mock).mockResolvedValue(mockApplication);

        await applicationController.getApplicationById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              id: 'app-001',
            }),
          })
        );
      });
    });

    describe('when application not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { applicationId: 'nonexistent' };

        (ApplicationService.getApplicationById as jest.Mock).mockResolvedValue(null);

        await applicationController.getApplicationById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Application not found',
          })
        );
      });
    });

    describe('when user does not have access', () => {
      it('should return 403 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (ApplicationService.getApplicationById as jest.Mock).mockRejectedValue(
          new Error('Access denied')
        );

        await applicationController.getApplicationById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Access denied',
          })
        );
      });
    });
  });

  describe('updateApplication - Update application data', () => {
    describe('when updating with valid data', () => {
      it('should update application and return success', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          answers: { housing_type: 'apartment' },
          notes: 'Updated notes',
        };

        const mockUpdatedApplication = {
          application_id: 'app-001',
          answers: { housing_type: 'apartment' },
          notes: 'Updated notes',
        };

        (ApplicationService.updateApplication as jest.Mock).mockResolvedValue(
          mockUpdatedApplication
        );

        await applicationController.updateApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Application updated successfully',
            data: mockUpdatedApplication,
          })
        );
      });
    });

    describe('when application not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { applicationId: 'nonexistent' };
        mockRequest.body = { notes: 'Test' };

        (ApplicationService.updateApplication as jest.Mock).mockRejectedValue(
          new Error('Application not found')
        );

        await applicationController.updateApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Application not found',
          })
        );
      });
    });

    describe('when user does not have permission', () => {
      it('should return 403 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = { notes: 'Test' };

        (ApplicationService.updateApplication as jest.Mock).mockRejectedValue(
          new Error('Access denied')
        );

        await applicationController.updateApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Access denied',
          })
        );
      });
    });

    describe('when application cannot be updated (wrong status)', () => {
      it('should return 409 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = { answers: {} };

        (ApplicationService.updateApplication as jest.Mock).mockRejectedValue(
          new Error('Application in APPROVED status cannot be updated')
        );

        await applicationController.updateApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });
    });
  });

  describe('submitApplication - Submit draft application', () => {
    describe('when submitting draft application', () => {
      it('should change status to submitted', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        const mockSubmittedApplication = {
          application_id: 'app-001',
          status: ApplicationStatus.SUBMITTED,
          submitted_at: new Date().toISOString(),
        };

        (ApplicationService.submitApplication as jest.Mock).mockResolvedValue(
          mockSubmittedApplication
        );

        await applicationController.submitApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Application submitted successfully',
            data: mockSubmittedApplication,
          })
        );
      });
    });

    describe('when application not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { applicationId: 'nonexistent' };

        (ApplicationService.submitApplication as jest.Mock).mockRejectedValue(
          new Error('Application not found')
        );

        await applicationController.submitApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Application not found',
          })
        );
      });
    });

    describe('when user does not own application', () => {
      it('should return 403 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (ApplicationService.submitApplication as jest.Mock).mockRejectedValue(
          new Error('Access denied')
        );

        await applicationController.submitApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Access denied',
          })
        );
      });
    });

    describe('when application is not in draft status', () => {
      it('should return 400 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (ApplicationService.submitApplication as jest.Mock).mockRejectedValue(
          new Error('Only draft applications can be submitted')
        );

        await applicationController.submitApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });
    });

    describe('when application is incomplete', () => {
      it('should return 400 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (ApplicationService.submitApplication as jest.Mock).mockRejectedValue(
          new Error('Application is incomplete')
        );

        await applicationController.submitApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });
    });
  });

  describe('updateApplicationStatus - Update application status', () => {
    describe('when updating status with valid data', () => {
      it('should update status successfully', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          status: ApplicationStatus.APPROVED,
          notes: 'Approved after interview',
        };

        const mockUpdatedApplication = {
          application_id: 'app-001',
          status: ApplicationStatus.APPROVED,
          actioned_by: 'user-123',
        };

        (ApplicationService.updateApplicationStatus as jest.Mock).mockResolvedValue(
          mockUpdatedApplication
        );

        await applicationController.updateApplicationStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Application status updated successfully',
            data: mockUpdatedApplication,
          })
        );
      });

      it('should include rejection reason when rejecting', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          status: ApplicationStatus.REJECTED,
          rejection_reason: 'Not suitable housing',
        };

        (ApplicationService.updateApplicationStatus as jest.Mock).mockResolvedValue({
          application_id: 'app-001',
          status: ApplicationStatus.REJECTED,
        });

        await applicationController.updateApplicationStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ApplicationService.updateApplicationStatus).toHaveBeenCalledWith(
          'app-001',
          expect.objectContaining({
            status: ApplicationStatus.REJECTED,
            rejection_reason: 'Not suitable housing',
            actioned_by: 'user-123',
          }),
          'user-123'
        );
      });
    });

    describe('when application not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { applicationId: 'nonexistent' };
        mockRequest.body = { status: ApplicationStatus.APPROVED };

        (ApplicationService.updateApplicationStatus as jest.Mock).mockRejectedValue(
          new Error('Application not found')
        );

        await applicationController.updateApplicationStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Application not found',
          })
        );
      });
    });

    describe('when status transition is invalid', () => {
      it('should return 400 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = { status: ApplicationStatus.APPROVED };

        (ApplicationService.updateApplicationStatus as jest.Mock).mockRejectedValue(
          new Error('Cannot transition from REJECTED to APPROVED')
        );

        await applicationController.updateApplicationStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });
    });
  });

  describe('withdrawApplication - Withdraw application', () => {
    describe('when withdrawing application', () => {
      it('should set status to withdrawn', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        const mockWithdrawnApplication = {
          application_id: 'app-001',
          status: ApplicationStatus.WITHDRAWN,
        };

        (ApplicationService.withdrawApplication as jest.Mock).mockResolvedValue(
          mockWithdrawnApplication
        );

        await applicationController.withdrawApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Application withdrawn successfully',
            data: mockWithdrawnApplication,
          })
        );
      });
    });

    describe('when application not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { applicationId: 'nonexistent' };

        (ApplicationService.withdrawApplication as jest.Mock).mockRejectedValue(
          new Error('Application not found')
        );

        await applicationController.withdrawApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Application not found',
          })
        );
      });
    });

    describe('when user does not own application', () => {
      it('should return 403 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (ApplicationService.withdrawApplication as jest.Mock).mockRejectedValue(
          new Error('Access denied')
        );

        await applicationController.withdrawApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Access denied',
          })
        );
      });
    });

    describe('when application cannot be withdrawn', () => {
      it('should return 400 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (ApplicationService.withdrawApplication as jest.Mock).mockRejectedValue(
          new Error('Application in APPROVED status cannot be withdrawn')
        );

        await applicationController.withdrawApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });
    });
  });

  describe('addDocument - Add document to application', () => {
    describe('when adding valid document', () => {
      it('should add document and return success', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          document_type: 'proof_of_residence',
          file_name: 'lease.pdf',
          file_url: 'https://storage.example.com/lease.pdf',
        };

        const mockUpdatedApplication = {
          application_id: 'app-001',
          documents: [
            {
              document_id: 'doc-001',
              document_type: 'proof_of_residence',
              file_name: 'lease.pdf',
              file_url: 'https://storage.example.com/lease.pdf',
            },
          ],
        };

        (ApplicationService.addDocument as jest.Mock).mockResolvedValue(mockUpdatedApplication);

        await applicationController.addDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Document added successfully',
            data: mockUpdatedApplication,
          })
        );
      });
    });

    describe('when application not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { applicationId: 'nonexistent' };
        mockRequest.body = {
          document_type: 'test',
          file_name: 'test.pdf',
          file_url: 'https://example.com/test.pdf',
        };

        (ApplicationService.addDocument as jest.Mock).mockRejectedValue(
          new Error('Application not found')
        );

        await applicationController.addDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Application not found',
          })
        );
      });
    });

    describe('when user does not have access', () => {
      it('should return 403 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          document_type: 'test',
          file_name: 'test.pdf',
          file_url: 'https://example.com/test.pdf',
        };

        (ApplicationService.addDocument as jest.Mock).mockRejectedValue(
          new Error('Access denied')
        );

        await applicationController.addDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Access denied',
          })
        );
      });
    });
  });

  describe('updateReference - Update reference status', () => {
    describe('when updating reference with valid data', () => {
      it('should update reference status', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          reference_index: 0,
          status: 'verified',
          notes: 'Spoke with reference, positive feedback',
        };

        const mockUpdatedApplication = {
          application_id: 'app-001',
          references: [
            {
              name: 'Jane Smith',
              status: 'verified',
              notes: 'Spoke with reference, positive feedback',
            },
          ],
        };

        (ApplicationService.updateReference as jest.Mock).mockResolvedValue(
          mockUpdatedApplication
        );

        await applicationController.updateReference(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Reference updated successfully',
            data: mockUpdatedApplication,
          })
        );
      });

      it('should support referenceId format', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          referenceId: 'ref-0',
          status: 'contacted',
        };

        (ApplicationService.updateReference as jest.Mock).mockResolvedValue({
          application_id: 'app-001',
        });

        await applicationController.updateReference(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ApplicationService.updateReference).toHaveBeenCalledWith(
          'app-001',
          expect.objectContaining({
            referenceId: 'ref-0',
            status: 'contacted',
          }),
          'user-123'
        );
      });
    });

    describe('when application not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { applicationId: 'nonexistent' };
        mockRequest.body = { reference_index: 0, status: 'verified' };

        (ApplicationService.updateReference as jest.Mock).mockRejectedValue(
          new Error('Application not found')
        );

        await applicationController.updateReference(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Application not found',
          })
        );
      });
    });

    describe('when reference index is out of bounds', () => {
      it('should return 400 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = { reference_index: 10, status: 'verified' };

        (ApplicationService.updateReference as jest.Mock).mockRejectedValue(
          new Error('Reference index out of bounds')
        );

        await applicationController.updateReference(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });
    });
  });

  describe('getApplicationFormStructure - Get form structure', () => {
    describe('when retrieving form structure', () => {
      it('should return form questions', async () => {
        mockRequest.params = { rescueId: 'rescue-789' };

        const mockFormStructure = {
          sections: [
            {
              title: 'Personal Information',
              questions: [
                {
                  question_id: 'q1',
                  question_text: 'What is your housing type?',
                  question_type: 'select',
                  required: true,
                },
              ],
            },
          ],
        };

        (ApplicationService.getApplicationFormStructure as jest.Mock).mockResolvedValue(
          mockFormStructure
        );

        await applicationController.getApplicationFormStructure(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockFormStructure,
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { rescueId: 'rescue-789' };

        (ApplicationService.getApplicationFormStructure as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await applicationController.getApplicationFormStructure(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to get application form structure',
          })
        );
      });
    });
  });

  describe('getApplicationStatistics - Get statistics', () => {
    describe('when retrieving statistics', () => {
      it('should return statistics data', async () => {
        mockRequest.query = { rescueId: 'rescue-789' };

        const mockStatistics = {
          total: 100,
          by_status: {
            [ApplicationStatus.SUBMITTED]: 30,
            [ApplicationStatus.APPROVED]: 20,
            [ApplicationStatus.REJECTED]: 15,
          },
          by_priority: {
            [ApplicationPriority.HIGH]: 10,
            [ApplicationPriority.NORMAL]: 70,
            [ApplicationPriority.LOW]: 20,
          },
        };

        (ApplicationService.getApplicationStatistics as jest.Mock).mockResolvedValue(
          mockStatistics
        );

        await applicationController.getApplicationStatistics(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockStatistics,
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        (ApplicationService.getApplicationStatistics as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await applicationController.getApplicationStatistics(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to retrieve application statistics',
          })
        );
      });
    });
  });

  describe('bulkUpdateApplications - Bulk update multiple applications', () => {
    describe('when bulk updating with valid data', () => {
      it('should update multiple applications', async () => {
        mockRequest.body = {
          application_ids: ['app-001', 'app-002', 'app-003'],
          updates: {
            status: ApplicationStatus.REJECTED,
            tags: ['bulk-rejected'],
          },
        };

        const mockResult = {
          updated_count: 3,
          failed_count: 0,
          updated_ids: ['app-001', 'app-002', 'app-003'],
          failed_ids: [],
        };

        (ApplicationService.bulkUpdateApplications as jest.Mock).mockResolvedValue(mockResult);

        await applicationController.bulkUpdateApplications(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Bulk update completed',
            data: mockResult,
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        mockRequest.body = {
          application_ids: ['app-001'],
          updates: { status: ApplicationStatus.APPROVED },
        };

        (ApplicationService.bulkUpdateApplications as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await applicationController.bulkUpdateApplications(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to perform bulk update',
          })
        );
      });
    });
  });

  describe('deleteApplication - Delete application', () => {
    describe('when deleting application', () => {
      it('should delete successfully', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (ApplicationService.deleteApplication as jest.Mock).mockResolvedValue(undefined);

        await applicationController.deleteApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Application deleted successfully',
          })
        );
      });
    });

    describe('when application not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { applicationId: 'nonexistent' };

        (ApplicationService.deleteApplication as jest.Mock).mockRejectedValue(
          new Error('Application not found')
        );

        await applicationController.deleteApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Application not found',
          })
        );
      });
    });

    describe('when user does not have access', () => {
      it('should return 403 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (ApplicationService.deleteApplication as jest.Mock).mockRejectedValue(
          new Error('Access denied')
        );

        await applicationController.deleteApplication(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Access denied',
          })
        );
      });
    });
  });

  describe('validateApplicationAnswers - Validate answers', () => {
    describe('when validating with valid answers', () => {
      it('should return validation result', async () => {
        mockRequest.params = { rescueId: 'rescue-789' };
        mockRequest.body = {
          answers: {
            housing_type: 'house',
            has_yard: true,
          },
        };

        const mockValidation = {
          is_valid: true,
          errors: [],
          warnings: [],
        };

        (ApplicationService.validateApplicationAnswers as jest.Mock).mockResolvedValue(
          mockValidation
        );

        await applicationController.validateApplicationAnswers(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockValidation,
          })
        );
      });
    });

    describe('when answers are missing', () => {
      it('should return 400 error', async () => {
        mockRequest.params = { rescueId: 'rescue-789' };
        mockRequest.body = {};

        await applicationController.validateApplicationAnswers(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Answers object is required',
          })
        );
      });
    });
  });

  describe('getApplicationHistory - Get application history', () => {
    describe('when retrieving history', () => {
      it('should return message about timeline system', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        await applicationController.getApplicationHistory(
          mockRequest as any,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: [],
            message: 'Application history is now available through timeline events',
          })
        );
      });
    });
  });

  describe('scheduleVisit - Schedule visit (not implemented)', () => {
    describe('when calling scheduleVisit', () => {
      it('should return 501 not implemented', async () => {
        await applicationController.scheduleVisit(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(501);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Visit scheduling feature not yet implemented',
          })
        );
      });
    });
  });

  describe('getHomeVisits - Get home visits for application', () => {
    describe('when visits exist', () => {
      it('should return formatted visits', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        const mockVisits = [
          {
            visit_id: 'visit-001',
            application_id: 'app-001',
            scheduled_date: '2024-01-15',
            scheduled_time: '14:00',
            assigned_staff: 'staff-123',
            status: HomeVisitStatus.SCHEDULED,
            notes: 'Initial home visit',
            outcome: null,
            outcome_notes: null,
            reschedule_reason: null,
            cancelled_reason: null,
            completed_at: null,
          },
        ];

        (HomeVisit.findAll as jest.Mock).mockResolvedValue(mockVisits);

        await applicationController.getHomeVisits(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            visits: expect.arrayContaining([
              expect.objectContaining({
                id: 'visit-001',
                applicationId: 'app-001',
                scheduledDate: '2024-01-15',
                scheduledTime: '14:00',
                status: HomeVisitStatus.SCHEDULED,
              }),
            ]),
          })
        );
      });
    });

    describe('when no visits exist', () => {
      it('should return empty array', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (HomeVisit.findAll as jest.Mock).mockResolvedValue([]);

        await applicationController.getHomeVisits(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            visits: [],
          })
        );
      });
    });

    describe('when database error occurs', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };

        (HomeVisit.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));

        await applicationController.getHomeVisits(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to retrieve home visits',
          })
        );
      });
    });
  });

  describe('scheduleHomeVisit - Schedule a home visit', () => {
    describe('when scheduling with valid data', () => {
      it('should create visit and return 201 status', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          scheduled_date: '2024-01-20',
          scheduled_time: '15:00',
          assigned_staff: 'staff-456',
          notes: 'Home visit for adoption',
        };

        const mockVisit = {
          visit_id: 'visit-001',
          application_id: 'app-001',
          scheduled_date: '2024-01-20',
          scheduled_time: '15:00',
          assigned_staff: 'staff-456',
          status: HomeVisitStatus.SCHEDULED,
          notes: 'Home visit for adoption',
        };

        (HomeVisit.create as jest.Mock).mockResolvedValue(mockVisit);
        (Application.update as jest.Mock).mockResolvedValue([1]);

        await applicationController.scheduleHomeVisit(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Home visit scheduled successfully',
            visit: expect.objectContaining({
              id: 'visit-001',
              applicationId: 'app-001',
            }),
          })
        );
      });
    });

    describe('when required fields are missing', () => {
      it('should return 400 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          scheduled_date: '2024-01-20',
          // Missing scheduled_time and assigned_staff
        };

        await applicationController.scheduleHomeVisit(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Missing required fields: scheduled_date, scheduled_time, assigned_staff',
          })
        );
      });
    });

    describe('when database error occurs', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {
          scheduled_date: '2024-01-20',
          scheduled_time: '15:00',
          assigned_staff: 'staff-456',
        };

        (HomeVisit.create as jest.Mock).mockRejectedValue(new Error('Database error'));

        await applicationController.scheduleHomeVisit(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to schedule home visit',
          })
        );
      });
    });
  });

  describe('updateHomeVisit - Update home visit', () => {
    describe('when updating with valid data', () => {
      it('should update visit successfully', async () => {
        mockRequest.params = { applicationId: 'app-001', visitId: 'visit-001' };
        mockRequest.body = {
          status: 'completed',
          outcome: 'approved',
          outcomeNotes: 'Home is suitable for pet',
        };

        const mockVisit = {
          visit_id: 'visit-001',
          application_id: 'app-001',
          status: HomeVisitStatus.SCHEDULED,
          update: jest.fn().mockResolvedValue(undefined),
          scheduled_date: '2024-01-20',
          scheduled_time: '15:00',
          assigned_staff: 'staff-456',
          notes: 'Test notes',
          outcome: 'approved',
          outcome_notes: 'Home is suitable for pet',
          reschedule_reason: null,
          cancelled_reason: null,
          completed_at: new Date(),
        };

        (HomeVisit.findOne as jest.Mock).mockResolvedValue(mockVisit);
        (Application.update as jest.Mock).mockResolvedValue([1]);

        await applicationController.updateHomeVisit(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockVisit.update).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Home visit updated successfully',
          })
        );
      });

      it('should update application status based on outcome', async () => {
        mockRequest.params = { applicationId: 'app-001', visitId: 'visit-001' };
        mockRequest.body = {
          status: 'completed',
          outcome: 'approved',
        };

        const mockVisit = {
          visit_id: 'visit-001',
          application_id: 'app-001',
          status: HomeVisitStatus.SCHEDULED,
          update: jest.fn().mockResolvedValue(undefined),
          scheduled_date: '2024-01-20',
          scheduled_time: '15:00',
          assigned_staff: 'staff-456',
          notes: null,
          outcome: null,
          outcome_notes: null,
          reschedule_reason: null,
          cancelled_reason: null,
          completed_at: null,
        };

        (HomeVisit.findOne as jest.Mock).mockResolvedValue(mockVisit);
        (Application.update as jest.Mock).mockResolvedValue([1]);

        await applicationController.updateHomeVisit(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(Application.update).toHaveBeenCalledWith(
          { status: ApplicationStatus.APPROVED },
          { where: { application_id: 'app-001' } }
        );
      });

      it('should handle rejected outcome', async () => {
        mockRequest.params = { applicationId: 'app-001', visitId: 'visit-001' };
        mockRequest.body = {
          status: 'completed',
          outcome: 'rejected',
          outcomeNotes: 'Home not suitable',
        };

        const mockVisit = {
          visit_id: 'visit-001',
          application_id: 'app-001',
          status: HomeVisitStatus.SCHEDULED,
          update: jest.fn().mockResolvedValue(undefined),
          scheduled_date: '2024-01-20',
          scheduled_time: '15:00',
          assigned_staff: 'staff-456',
          notes: null,
          outcome: null,
          outcome_notes: null,
          reschedule_reason: null,
          cancelled_reason: null,
          completed_at: null,
        };

        (HomeVisit.findOne as jest.Mock).mockResolvedValue(mockVisit);
        (Application.update as jest.Mock).mockResolvedValue([1]);

        await applicationController.updateHomeVisit(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(Application.update).toHaveBeenCalledWith(
          { status: ApplicationStatus.REJECTED },
          { where: { application_id: 'app-001' } }
        );
      });
    });

    describe('when visit not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { applicationId: 'app-001', visitId: 'nonexistent' };
        mockRequest.body = { status: 'completed' };

        (HomeVisit.findOne as jest.Mock).mockResolvedValue(null);

        await applicationController.updateHomeVisit(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Home visit not found',
          })
        );
      });
    });

    describe('when database error occurs', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { applicationId: 'app-001', visitId: 'visit-001' };
        mockRequest.body = { status: 'completed' };

        (HomeVisit.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

        await applicationController.updateHomeVisit(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to update home visit',
          })
        );
      });
    });
  });

  describe('Error handling and logging', () => {
    it('should log errors with appropriate context', async () => {
      mockRequest.body = {
        pet_id: 'pet-456',
        answers: {},
        references: [],
      };

      (ApplicationService.createApplication as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      await applicationController.createApplication(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(logger.error).toHaveBeenCalledWith('Error creating application:', expect.any(Error));
    });

    it('should handle unknown error types gracefully', async () => {
      mockRequest.params = { applicationId: 'app-001' };

      (ApplicationService.getApplicationById as jest.Mock).mockRejectedValue(
        'String error instead of Error object'
      );

      await applicationController.getApplicationById(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
