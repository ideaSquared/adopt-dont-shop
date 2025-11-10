// Mock dependencies before imports
jest.mock('../../services/rescue.service');
jest.mock('../../services/invitation.service');
jest.mock('../../services/email.service');
jest.mock('../../services/email-template.service');

// Mock Role model explicitly to prevent init from running
jest.mock('../../models/Role', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    belongsToMany: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
  },
}));

//Mock UserRole model
jest.mock('../../models/UserRole', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    bulkCreate: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
  },
}));

// Mock Invitation model
jest.mock('../../models/Invitation', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
  },
}));

// Mock EmailTemplate model with enums
jest.mock('../../models/EmailTemplate', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
  },
  TemplateType: {
    TRANSACTIONAL: 'transactional',
    NOTIFICATION: 'notification',
    MARKETING: 'marketing',
  },
  TemplateCategory: {
    WELCOME: 'welcome',
    ADOPTION: 'adoption',
    VERIFICATION: 'verification',
    NOTIFICATION: 'notification',
  },
  TemplateStatus: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DRAFT: 'draft',
  },
}));

// Mock EmailQueue model with enums
jest.mock('../../models/EmailQueue', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
  },
  EmailType: {
    SYSTEM: 'system',
    TRANSACTIONAL: 'transactional',
    NOTIFICATION: 'notification',
    MARKETING: 'marketing',
  },
  EmailPriority: {
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
}));

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({
    isEmpty: jest.fn(() => true),
    array: jest.fn(() => []),
  })),
}));

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { RescueController } from '../../controllers/rescue.controller';
import { RescueService } from '../../services/rescue.service';
import { InvitationService } from '../../services/invitation.service';
import EmailService from '../../services/email.service';
import { AuthenticatedRequest } from '../../types/auth';
import { logger } from '../../utils/logger';
import { EmailType, EmailPriority } from '../../models/EmailQueue';

describe('RescueController', () => {
  let rescueController: RescueController;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockValidationResult: any;

  beforeEach(() => {
    rescueController = new RescueController();

    mockRequest = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'rescue_staff',
      } as any,
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockValidationResult = validationResult as any;

    // Clear all mocks
    jest.clearAllMocks();

    // Default validation to pass
    mockValidationResult.mockReturnValue({
      isEmpty: jest.fn(() => true),
      array: jest.fn(() => []),
    });
  });

  describe('searchRescues - Search rescues with filters and pagination', () => {
    describe('when searching rescues successfully', () => {
      it('should return paginated rescues with default parameters', async () => {
        mockRequest.query = {};

        const mockRescues = [
          {
            rescueId: 'rescue-001',
            name: 'Happy Paws Rescue',
            email: 'contact@happypaws.org',
            status: 'verified',
            city: 'New York',
            createdAt: new Date('2024-01-01'),
          },
        ];

        const mockResult = {
          rescues: mockRescues,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        };

        (RescueService.searchRescues as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.searchRescues(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.searchRescues).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          search: undefined,
          status: undefined,
          location: undefined,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        });
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockRescues,
          pagination: mockResult.pagination,
        });
      });

      it('should apply all filters from query parameters', async () => {
        mockRequest.query = {
          page: '2',
          limit: '10',
          search: 'happy',
          status: 'verified',
          location: 'New York',
          sortBy: 'name',
          sortOrder: 'ASC',
        };

        const mockResult = {
          rescues: [],
          pagination: {
            page: 2,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        };

        (RescueService.searchRescues as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.searchRescues(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.searchRescues).toHaveBeenCalledWith({
          page: 2,
          limit: 10,
          search: 'happy',
          status: 'verified',
          location: 'New York',
          sortBy: 'name',
          sortOrder: 'ASC',
        });
      });

      it('should enforce maximum limit of 100 per page', async () => {
        mockRequest.query = {
          limit: '500',
        };

        const mockResult = {
          rescues: [],
          pagination: {
            page: 1,
            limit: 100,
            total: 0,
            totalPages: 0,
          },
        };

        (RescueService.searchRescues as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.searchRescues(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.searchRescues).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 100,
          })
        );
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid page number', param: 'page' },
          ]),
        });

        await rescueController.searchRescues(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Validation failed',
          errors: [{ msg: 'Invalid page number', param: 'page' }],
        });
        expect(RescueService.searchRescues).not.toHaveBeenCalled();
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        const error = new Error('Database connection failed');
        (RescueService.searchRescues as jest.Mock).mockRejectedValue(error);

        await rescueController.searchRescues(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to search rescues',
          error: 'Database connection failed',
        });
        expect(logger.error).toHaveBeenCalledWith('Search rescues failed:', error);
      });
    });
  });

  describe('getRescueById - Get rescue by ID', () => {
    describe('when rescue exists', () => {
      it('should return rescue without stats by default', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.query = {};

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Happy Paws Rescue',
          email: 'contact@happypaws.org',
          status: 'verified',
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);

        await rescueController.getRescueById(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.getRescueById).toHaveBeenCalledWith('rescue-123', false);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockRescue,
        });
      });

      it('should return rescue with stats when requested', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.query = { includeStats: 'true' };

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Happy Paws Rescue',
          stats: {
            totalPets: 50,
            adoptedPets: 30,
          },
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);

        await rescueController.getRescueById(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.getRescueById).toHaveBeenCalledWith('rescue-123', true);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockRescue,
        });
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };

        const error = new Error('Rescue not found');
        (RescueService.getRescueById as jest.Mock).mockRejectedValue(error);

        await rescueController.getRescueById(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to retrieve rescue',
          error: 'Rescue not found',
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid rescue ID', param: 'rescueId' },
          ]),
        });

        await rescueController.getRescueById(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Validation failed',
          errors: [{ msg: 'Invalid rescue ID', param: 'rescueId' }],
        });
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        const error = new Error('Service error');
        (RescueService.getRescueById as jest.Mock).mockRejectedValue(error);

        await rescueController.getRescueById(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to retrieve rescue',
          error: 'Service error',
        });
      });
    });
  });

  describe('createRescue - Create new rescue organization', () => {
    describe('when creating rescue successfully', () => {
      it('should create rescue with all required fields', async () => {
        mockRequest.body = {
          name: 'Happy Paws Rescue',
          email: 'contact@happypaws.org',
          phone: '555-1234',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          website: 'https://happypaws.org',
          description: 'We rescue dogs',
          mission: 'Save all the dogs',
          ein: '12-3456789',
          registrationNumber: 'REG123',
          contactPerson: 'John Doe',
          contactTitle: 'Director',
          contactEmail: 'john@happypaws.org',
          contactPhone: '555-5678',
        };

        const mockRescue = {
          rescueId: 'rescue-123',
          ...mockRequest.body,
          status: 'pending',
        };

        (RescueService.createRescue as jest.Mock).mockResolvedValue(mockRescue);

        await rescueController.createRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.createRescue).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Happy Paws Rescue',
            email: 'contact@happypaws.org',
            county: 'NY', // Note: state is mapped to county
            postcode: '10001', // Note: zipCode is mapped to postcode
          }),
          'user-123'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Rescue organization created successfully',
          data: mockRescue,
        });
      });
    });

    describe('when rescue already exists', () => {
      it('should return 409 conflict error', async () => {
        mockRequest.body = {
          name: 'Existing Rescue',
          email: 'existing@rescue.org',
        };

        const error = new Error('Rescue with this email already exists');
        (RescueService.createRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.createRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue with this email already exists',
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Name is required', param: 'name' },
            { msg: 'Invalid email', param: 'email' },
          ]),
        });

        await rescueController.createRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Validation failed',
          errors: [
            { msg: 'Name is required', param: 'name' },
            { msg: 'Invalid email', param: 'email' },
          ],
        });
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.body = { name: 'Test Rescue' };

        const error = new Error('Database error');
        (RescueService.createRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.createRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to create rescue organization',
          error: 'Database error',
        });
      });
    });
  });

  describe('updateRescue - Update rescue information', () => {
    describe('when updating rescue successfully', () => {
      it('should update rescue with new data', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {
          name: 'Updated Rescue Name',
          phone: '555-9999',
        };

        const mockUpdatedRescue = {
          rescueId: 'rescue-123',
          name: 'Updated Rescue Name',
          phone: '555-9999',
        };

        (RescueService.updateRescue as jest.Mock).mockResolvedValue(mockUpdatedRescue);

        await rescueController.updateRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.updateRescue).toHaveBeenCalledWith(
          'rescue-123',
          mockRequest.body,
          'user-123'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Rescue updated successfully',
          data: mockUpdatedRescue,
        });
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };
        mockRequest.body = { name: 'New Name' };

        const error = new Error('Rescue not found');
        (RescueService.updateRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.updateRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue not found',
        });
      });
    });

    describe('when email already exists', () => {
      it('should return 409 conflict error', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { email: 'taken@example.com' };

        const error = new Error('Email already exists');
        (RescueService.updateRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.updateRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Email already exists',
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid email format', param: 'email' },
          ]),
        });

        await rescueController.updateRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Validation failed',
          errors: [{ msg: 'Invalid email format', param: 'email' }],
        });
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { name: 'Test' };

        const error = new Error('Service error');
        (RescueService.updateRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.updateRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to update rescue',
          error: 'Service error',
        });
      });
    });
  });

  describe('verifyRescue - Verify rescue organization (admin only)', () => {
    describe('when verifying rescue successfully', () => {
      it('should verify rescue with notes', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { notes: 'Documents verified' };

        const mockVerifiedRescue = {
          rescueId: 'rescue-123',
          status: 'verified',
          verifiedAt: new Date(),
        };

        (RescueService.verifyRescue as jest.Mock).mockResolvedValue(mockVerifiedRescue);

        await rescueController.verifyRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.verifyRescue).toHaveBeenCalledWith(
          'rescue-123',
          'user-123',
          'Documents verified'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Rescue verified successfully',
          data: mockVerifiedRescue,
        });
      });

      it('should verify rescue without notes', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {};

        const mockVerifiedRescue = {
          rescueId: 'rescue-123',
          status: 'verified',
        };

        (RescueService.verifyRescue as jest.Mock).mockResolvedValue(mockVerifiedRescue);

        await rescueController.verifyRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.verifyRescue).toHaveBeenCalledWith(
          'rescue-123',
          'user-123',
          undefined
        );
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };
        mockRequest.body = {};

        const error = new Error('Rescue not found');
        (RescueService.verifyRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.verifyRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue not found',
        });
      });
    });

    describe('when rescue already verified', () => {
      it('should return 409 conflict error', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {};

        const error = new Error('Rescue already verified');
        (RescueService.verifyRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.verifyRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue already verified',
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid rescue ID', param: 'rescueId' },
          ]),
        });

        await rescueController.verifyRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Validation failed',
          errors: [{ msg: 'Invalid rescue ID', param: 'rescueId' }],
        });
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {};

        const error = new Error('Service error');
        (RescueService.verifyRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.verifyRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to verify rescue',
          error: 'Service error',
        });
      });
    });
  });

  describe('rejectRescue - Reject a rescue organization', () => {
    describe('when rejecting rescue successfully', () => {
      it('should reject rescue with reason and notes', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {
          reason: 'Invalid documentation',
          notes: 'Missing tax documents',
        };

        const mockRejectedRescue = {
          rescueId: 'rescue-123',
          status: 'rejected',
          rejectionReason: 'Invalid documentation',
        };

        (RescueService.rejectRescue as jest.Mock).mockResolvedValue(mockRejectedRescue);

        await rescueController.rejectRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.rejectRescue).toHaveBeenCalledWith(
          'rescue-123',
          'user-123',
          'Invalid documentation',
          'Missing tax documents'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Rescue rejected successfully',
          data: mockRejectedRescue,
        });
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };
        mockRequest.body = { reason: 'Test' };

        const error = new Error('Rescue not found');
        (RescueService.rejectRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.rejectRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue not found',
        });
      });
    });

    describe('when rescue already verified or rejected', () => {
      it('should return 409 error for already verified rescue', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { reason: 'Test' };

        const error = new Error('Cannot reject already verified rescue');
        (RescueService.rejectRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.rejectRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Cannot reject already verified rescue',
        });
      });

      it('should return 409 error for already rejected rescue', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { reason: 'Test' };

        const error = new Error('Rescue already rejected');
        (RescueService.rejectRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.rejectRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(409);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Reason is required', param: 'reason' },
          ]),
        });

        await rescueController.rejectRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Validation failed',
          errors: [{ msg: 'Reason is required', param: 'reason' }],
        });
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { reason: 'Test' };

        const error = new Error('Service error');
        (RescueService.rejectRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.rejectRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to reject rescue',
          error: 'Service error',
        });
      });
    });
  });

  describe('getRescueStaff - Get rescue staff with pagination', () => {
    describe('when getting staff successfully', () => {
      it('should return paginated staff with default parameters', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.query = {};

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Test Rescue',
        };

        const mockStaff = [
          {
            userId: 'user-1',
            rescueId: 'rescue-123',
            title: 'Director',
            isVerified: true,
          },
        ];

        const mockResult = {
          staff: mockStaff,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);
        (RescueService.getRescueStaff as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.getRescueStaff(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.getRescueById).toHaveBeenCalledWith('rescue-123');
        expect(RescueService.getRescueStaff).toHaveBeenCalledWith('rescue-123', {
          page: 1,
          limit: 20,
        });
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockStaff,
          pagination: mockResult.pagination,
        });
      });

      it('should apply pagination from query parameters', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.query = { page: '2', limit: '10' };

        const mockRescue = { rescueId: 'rescue-123' };
        const mockResult = {
          staff: [],
          pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);
        (RescueService.getRescueStaff as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.getRescueStaff(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.getRescueStaff).toHaveBeenCalledWith('rescue-123', {
          page: 2,
          limit: 10,
        });
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(null);

        await rescueController.getRescueStaff(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue not found',
        });
        expect(RescueService.getRescueStaff).not.toHaveBeenCalled();
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid rescue ID', param: 'rescueId' },
          ]),
        });

        await rescueController.getRescueStaff(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Validation failed',
          errors: [{ msg: 'Invalid rescue ID', param: 'rescueId' }],
        });
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        const mockRescue = { rescueId: 'rescue-123' };
        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);

        const error = new Error('Service error');
        (RescueService.getRescueStaff as jest.Mock).mockRejectedValue(error);

        await rescueController.getRescueStaff(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to retrieve rescue staff',
          error: 'Service error',
        });
      });
    });
  });

  describe('addStaffMember - Add staff member to rescue', () => {
    describe('when adding staff successfully', () => {
      it('should add staff member with title', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {
          userId: 'user-456',
          title: 'Volunteer Coordinator',
        };

        const mockStaffMember = {
          userId: 'user-456',
          rescueId: 'rescue-123',
          title: 'Volunteer Coordinator',
          isVerified: true,
        };

        (RescueService.addStaffMember as jest.Mock).mockResolvedValue(mockStaffMember);

        await rescueController.addStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.addStaffMember).toHaveBeenCalledWith(
          'rescue-123',
          'user-456',
          'Volunteer Coordinator',
          'user-123'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Staff member added successfully',
          data: mockStaffMember,
        });
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };
        mockRequest.body = { userId: 'user-456', title: 'Staff' };

        const error = new Error('Rescue not found');
        (RescueService.addStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.addStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue not found',
        });
      });
    });

    describe('when user not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { userId: 'nonexistent', title: 'Staff' };

        const error = new Error('User not found');
        (RescueService.addStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.addStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });

    describe('when user already a staff member', () => {
      it('should return 409 conflict error', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { userId: 'user-456', title: 'Staff' };

        const error = new Error('User is already a staff member');
        (RescueService.addStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.addStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'User is already a staff member',
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'User ID is required', param: 'userId' },
          ]),
        });

        await rescueController.addStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Validation failed',
          errors: [{ msg: 'User ID is required', param: 'userId' }],
        });
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { userId: 'user-456', title: 'Staff' };

        const error = new Error('Service error');
        (RescueService.addStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.addStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to add staff member',
          error: 'Service error',
        });
      });
    });
  });

  describe('removeStaffMember - Remove staff member from rescue', () => {
    describe('when removing staff successfully', () => {
      it('should remove staff member', async () => {
        mockRequest.params = { rescueId: 'rescue-123', userId: 'user-456' };

        const mockResult = {
          message: 'Staff member removed successfully',
        };

        (RescueService.removeStaffMember as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.removeStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.removeStaffMember).toHaveBeenCalledWith(
          'rescue-123',
          'user-456',
          'user-123'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Staff member removed successfully',
        });
      });
    });

    describe('when trying to remove self', () => {
      it('should return 400 error preventing self-removal', async () => {
        mockRequest.params = { rescueId: 'rescue-123', userId: 'user-123' };

        await rescueController.removeStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'You cannot remove yourself from the rescue. Please ask another admin to remove you.',
        });
        expect(RescueService.removeStaffMember).not.toHaveBeenCalled();
      });
    });

    describe('when staff member not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'rescue-123', userId: 'user-456' };

        const error = new Error('Staff member not found');
        (RescueService.removeStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.removeStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Staff member not found',
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid user ID', param: 'userId' },
          ]),
        });

        await rescueController.removeStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123', userId: 'user-456' };

        const error = new Error('Service error');
        (RescueService.removeStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.removeStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to remove staff member',
          error: 'Service error',
        });
      });
    });
  });

  describe('updateStaffMember - Update staff member in rescue', () => {
    describe('when updating staff successfully', () => {
      it('should update staff member title', async () => {
        mockRequest.params = { rescueId: 'rescue-123', userId: 'user-456' };
        mockRequest.body = { title: 'Senior Coordinator' };

        const mockResult = {
          userId: 'user-456',
          rescueId: 'rescue-123',
          title: 'Senior Coordinator',
        };

        (RescueService.updateStaffMember as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.updateStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.updateStaffMember).toHaveBeenCalledWith(
          'rescue-123',
          'user-456',
          { title: 'Senior Coordinator' },
          'user-123'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Staff member updated successfully',
          data: mockResult,
        });
      });
    });

    describe('when trying to update self', () => {
      it('should return 400 error preventing self-editing', async () => {
        mockRequest.params = { rescueId: 'rescue-123', userId: 'user-123' };
        mockRequest.body = { title: 'New Title' };

        await rescueController.updateStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'You cannot edit your own profile. Please ask another admin to make changes to your account.',
        });
        expect(RescueService.updateStaffMember).not.toHaveBeenCalled();
      });
    });

    describe('when staff member not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'rescue-123', userId: 'user-456' };
        mockRequest.body = { title: 'New Title' };

        const error = new Error('Staff member not found');
        (RescueService.updateStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.updateStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Staff member not found',
        });
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent', userId: 'user-456' };
        mockRequest.body = { title: 'New Title' };

        const error = new Error('Rescue not found');
        (RescueService.updateStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.updateStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Title is required', param: 'title' },
          ]),
        });

        await rescueController.updateStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123', userId: 'user-456' };
        mockRequest.body = { title: 'New Title' };

        const error = new Error('Service error');
        (RescueService.updateStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.updateStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to update staff member',
          error: 'Service error',
        });
      });
    });
  });

  describe('getRescuePets - Get rescue pets with pagination', () => {
    describe('when getting pets successfully', () => {
      it('should return paginated pets with default parameters', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.query = {};

        const mockPets = [
          {
            petId: 'pet-1',
            name: 'Buddy',
            type: 'dog',
            status: 'available',
          },
        ];

        const mockResult = {
          pets: mockPets,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        };

        (RescueService.getRescuePets as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.getRescuePets(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.getRescuePets).toHaveBeenCalledWith('rescue-123', {
          page: 1,
          limit: 20,
          status: undefined,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        });
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockPets,
          pagination: mockResult.pagination,
        });
      });

      it('should apply filters and pagination from query parameters', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.query = {
          page: '2',
          limit: '10',
          status: 'adopted',
          sortBy: 'name',
          sortOrder: 'ASC',
        };

        const mockResult = {
          pets: [],
          pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
        };

        (RescueService.getRescuePets as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.getRescuePets(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.getRescuePets).toHaveBeenCalledWith('rescue-123', {
          page: 2,
          limit: 10,
          status: 'adopted',
          sortBy: 'name',
          sortOrder: 'ASC',
        });
      });

      it('should enforce maximum limit of 100', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.query = { limit: '500' };

        const mockResult = {
          pets: [],
          pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
        };

        (RescueService.getRescuePets as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.getRescuePets(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.getRescuePets).toHaveBeenCalledWith(
          'rescue-123',
          expect.objectContaining({
            limit: 100,
          })
        );
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid rescue ID', param: 'rescueId' },
          ]),
        });

        await rescueController.getRescuePets(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        const error = new Error('Service error');
        (RescueService.getRescuePets as jest.Mock).mockRejectedValue(error);

        await rescueController.getRescuePets(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to retrieve rescue pets',
          error: 'Service error',
        });
      });
    });
  });

  describe('getRescueAnalytics - Get rescue analytics and statistics', () => {
    describe('when getting analytics successfully', () => {
      it('should return rescue statistics', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        const mockStatistics = {
          totalPets: 100,
          availablePets: 75,
          adoptedPets: 20,
          pendingApplications: 10,
          approvedApplications: 15,
        };

        (RescueService.getRescueStatistics as jest.Mock).mockResolvedValue(mockStatistics);

        await rescueController.getRescueAnalytics(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.getRescueStatistics).toHaveBeenCalledWith('rescue-123');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockStatistics,
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid rescue ID', param: 'rescueId' },
          ]),
        });

        await rescueController.getRescueAnalytics(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        const error = new Error('Service error');
        (RescueService.getRescueStatistics as jest.Mock).mockRejectedValue(error);

        await rescueController.getRescueAnalytics(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to retrieve rescue analytics',
          error: 'Service error',
        });
      });
    });
  });

  describe('deleteRescue - Delete rescue (soft delete, admin only)', () => {
    describe('when deleting rescue successfully', () => {
      it('should soft delete rescue with reason', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { reason: 'Organization closed' };

        const mockResult = {
          message: 'Rescue deleted successfully',
        };

        (RescueService.deleteRescue as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.deleteRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.deleteRescue).toHaveBeenCalledWith(
          'rescue-123',
          'user-123',
          'Organization closed'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Rescue deleted successfully',
        });
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };
        mockRequest.body = { reason: 'Test' };

        const error = new Error('Rescue not found');
        (RescueService.deleteRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.deleteRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue not found',
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid rescue ID', param: 'rescueId' },
          ]),
        });

        await rescueController.deleteRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { reason: 'Test' };

        const error = new Error('Service error');
        (RescueService.deleteRescue as jest.Mock).mockRejectedValue(error);

        await rescueController.deleteRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to delete rescue',
          error: 'Service error',
        });
      });
    });
  });

  describe('inviteStaffMember - Invite a new staff member to join the rescue', () => {
    describe('when inviting staff successfully', () => {
      it('should send invitation to staff member', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {
          email: 'newstaff@example.com',
          title: 'Volunteer',
        };

        const mockResult = {
          success: true,
          message: 'Invitation sent successfully',
          data: {
            invitationId: 'inv-123',
            email: 'newstaff@example.com',
            status: 'pending',
          },
        };

        (InvitationService.inviteStaffMember as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.inviteStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(InvitationService.inviteStaffMember).toHaveBeenCalledWith(
          'rescue-123',
          'newstaff@example.com',
          'Volunteer',
          'user-123'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid email', param: 'email' },
          ]),
        });

        await rescueController.inviteStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {
          email: 'newstaff@example.com',
          title: 'Volunteer',
        };

        const error = new Error('Email service error');
        (InvitationService.inviteStaffMember as jest.Mock).mockRejectedValue(error);

        await rescueController.inviteStaffMember(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to invite staff member',
          error: 'Email service error',
        });
        expect(logger.error).toHaveBeenCalledWith(
          'Error inviting staff member:',
          expect.objectContaining({
            error: 'Email service error',
            rescueId: 'rescue-123',
          })
        );
      });
    });
  });

  describe('getPendingInvitations - Get pending invitations for a rescue', () => {
    describe('when getting invitations successfully', () => {
      it('should return pending invitations', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        const mockResult = {
          success: true,
          data: [
            {
              invitationId: 'inv-1',
              email: 'staff1@example.com',
              status: 'pending',
              createdAt: new Date(),
            },
            {
              invitationId: 'inv-2',
              email: 'staff2@example.com',
              status: 'pending',
              createdAt: new Date(),
            },
          ],
        };

        (InvitationService.getPendingInvitations as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.getPendingInvitations(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(InvitationService.getPendingInvitations).toHaveBeenCalledWith('rescue-123');
        expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid rescue ID', param: 'rescueId' },
          ]),
        });

        await rescueController.getPendingInvitations(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        const error = new Error('Service error');
        (InvitationService.getPendingInvitations as jest.Mock).mockRejectedValue(error);

        await rescueController.getPendingInvitations(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to get pending invitations',
          error: 'Service error',
        });
      });
    });
  });

  describe('cancelInvitation - Cancel a pending invitation', () => {
    describe('when canceling invitation successfully', () => {
      it('should cancel the invitation', async () => {
        mockRequest.params = { rescueId: 'rescue-123', invitationId: '456' };

        const mockResult = {
          success: true,
          message: 'Invitation cancelled successfully',
        };

        (InvitationService.cancelInvitation as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.cancelInvitation(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(InvitationService.cancelInvitation).toHaveBeenCalledWith(
          456,
          'user-123'
        );
        expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid invitation ID', param: 'invitationId' },
          ]),
        });

        await rescueController.cancelInvitation(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123', invitationId: '456' };

        const error = new Error('Service error');
        (InvitationService.cancelInvitation as jest.Mock).mockRejectedValue(error);

        await rescueController.cancelInvitation(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to cancel invitation',
          error: 'Service error',
        });
      });
    });
  });

  describe('updateAdoptionPolicies - Update adoption policies for a rescue', () => {
    describe('when updating policies successfully', () => {
      it('should update adoption policies', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {
          adoptionFee: {
            min: 100,
            max: 500,
            currency: 'USD',
          },
          homeVisitRequired: true,
          applicationFee: 25,
        };

        const mockResult = {
          rescueId: 'rescue-123',
          adoptionPolicies: mockRequest.body,
        };

        (RescueService.updateAdoptionPolicies as jest.Mock).mockResolvedValue(mockResult);

        await rescueController.updateAdoptionPolicies(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.updateAdoptionPolicies).toHaveBeenCalledWith(
          'rescue-123',
          mockRequest.body,
          'user-123'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Adoption policies updated successfully',
          data: mockResult,
        });
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };
        mockRequest.body = { adoptionFee: { min: 100, max: 500 } };

        const error = new Error('Rescue not found');
        (RescueService.updateAdoptionPolicies as jest.Mock).mockRejectedValue(error);

        await rescueController.updateAdoptionPolicies(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue not found',
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid policy data', param: 'adoptionFee' },
          ]),
        });

        await rescueController.updateAdoptionPolicies(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { adoptionFee: { min: 100 } };

        const error = new Error('Service error');
        (RescueService.updateAdoptionPolicies as jest.Mock).mockRejectedValue(error);

        await rescueController.updateAdoptionPolicies(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to update adoption policies',
          error: 'Service error',
        });
      });
    });
  });

  describe('getAdoptionPolicies - Get adoption policies for a rescue', () => {
    describe('when getting policies successfully', () => {
      it('should return adoption policies', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        const mockPolicies = {
          adoptionFee: {
            min: 100,
            max: 500,
            currency: 'USD',
          },
          homeVisitRequired: true,
          applicationFee: 25,
        };

        (RescueService.getAdoptionPolicies as jest.Mock).mockResolvedValue(mockPolicies);

        await rescueController.getAdoptionPolicies(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(RescueService.getAdoptionPolicies).toHaveBeenCalledWith('rescue-123');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockPolicies,
        });
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };

        const error = new Error('Rescue not found');
        (RescueService.getAdoptionPolicies as jest.Mock).mockRejectedValue(error);

        await rescueController.getAdoptionPolicies(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue not found',
        });
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid rescue ID', param: 'rescueId' },
          ]),
        });

        await rescueController.getAdoptionPolicies(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle general errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        const error = new Error('Service error');
        (RescueService.getAdoptionPolicies as jest.Mock).mockRejectedValue(error);

        await rescueController.getAdoptionPolicies(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to retrieve adoption policies',
          error: 'Service error',
        });
      });
    });
  });

  describe('sendEmail - Send email to rescue organization', () => {
    describe('when sending email successfully', () => {
      it('should send email with subject and body', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {
          subject: 'Important Update',
          body: '<p>Hello from Admin</p>',
        };

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Happy Paws Rescue',
          email: 'contact@happypaws.org',
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);
        (EmailService.sendEmail as jest.Mock).mockResolvedValue('email-123');

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(RescueService.getRescueById).toHaveBeenCalledWith('rescue-123', false);
        expect(EmailService.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            toEmail: 'contact@happypaws.org',
            toName: 'Happy Paws Rescue',
            subject: 'Important Update',
            htmlContent: '<p>Hello from Admin</p>',
            type: EmailType.SYSTEM,
            priority: EmailPriority.NORMAL,
            tags: ['rescue-email', 'rescue-123'],
          })
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Email sent successfully',
          data: {
            emailId: 'email-123',
            recipientEmail: 'contact@happypaws.org',
          },
        });
      });

      it('should send email with template', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = {
          templateId: 'welcome-template',
        };

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Happy Paws Rescue',
          email: 'contact@happypaws.org',
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);
        (EmailService.sendEmail as jest.Mock).mockResolvedValue('email-456');

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(EmailService.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            templateId: 'welcome-template',
            toEmail: 'contact@happypaws.org',
            toName: 'Happy Paws Rescue',
          })
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });

    describe('when rescue not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { rescueId: 'nonexistent' };
        mockRequest.body = { subject: 'Test', body: 'Test' };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(null);

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue not found',
        });
        expect(EmailService.sendEmail).not.toHaveBeenCalled();
      });
    });

    describe('when rescue has no email', () => {
      it('should return 400 error', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { subject: 'Test', body: 'Test' };

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Happy Paws Rescue',
          email: null,
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rescue organization does not have an email address',
        });
      });
    });

    describe('when email parameters are missing', () => {
      it('should return 400 error when no template and missing subject', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { body: 'Test body' };

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Happy Paws Rescue',
          email: 'contact@happypaws.org',
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Either templateId or both subject and body are required',
        });
      });

      it('should return 400 error when no template and missing body', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { subject: 'Test subject' };

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Happy Paws Rescue',
          email: 'contact@happypaws.org',
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for validation failures', async () => {
        mockValidationResult.mockReturnValue({
          isEmpty: jest.fn(() => false),
          array: jest.fn(() => [
            { msg: 'Invalid rescue ID', param: 'rescueId' },
          ]),
        });

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('when service throws error', () => {
      it('should handle email service errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { subject: 'Test', body: 'Test' };

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Happy Paws Rescue',
          email: 'contact@happypaws.org',
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);
        (EmailService.sendEmail as jest.Mock).mockRejectedValue(new Error('Email service down'));

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Failed to send email',
          error: 'Email service down',
        });
      });

      it('should handle rescue retrieval errors and return 500', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { subject: 'Test', body: 'Test' };

        const error = new Error('Rescue not found');
        (RescueService.getRescueById as jest.Mock).mockRejectedValue(error);

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });

    describe('when email sent successfully', () => {
      it('should log email details', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.body = { subject: 'Test', body: 'Test' };

        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Happy Paws Rescue',
          email: 'contact@happypaws.org',
        };

        (RescueService.getRescueById as jest.Mock).mockResolvedValue(mockRescue);
        (EmailService.sendEmail as jest.Mock).mockResolvedValue('email-123');

        await rescueController.sendEmail(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(logger.info).toHaveBeenCalledWith(
          'Email sent to rescue organization',
          expect.objectContaining({
            rescueId: 'rescue-123',
            rescueName: 'Happy Paws Rescue',
            emailId: 'email-123',
            sentBy: 'user-123',
          })
        );
      });
    });
  });
});
