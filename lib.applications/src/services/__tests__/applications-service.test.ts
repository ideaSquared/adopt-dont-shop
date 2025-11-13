import { ApplicationsService } from '../applications-service';
import { ApiService } from '@adopt-dont-shop/lib.api';
import {
  ApplicationData,
  ApplicationStatus,
  Application,
  ApplicationWithPetInfo,
  DocumentUpload,
  Document,
} from '../../types';

// Mock the ApiService
jest.mock('@adopt-dont-shop/lib.api');

describe('ApplicationsService', () => {
  let applicationsService: ApplicationsService;
  let mockApiService: jest.Mocked<ApiService>;

  const mockApplicationData: ApplicationData = {
    userId: 'user-123',
    rescueId: 'rescue-123',
    petId: 'pet-123',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      dateOfBirth: '1990-01-01',
      occupation: 'Software Engineer',
    },
    livingsituation: {
      housingType: 'house',
      isOwned: true,
      hasYard: true,
      yardSize: 'large',
      yardFenced: true,
      allowsPets: true,
      landlordContact: undefined,
      householdSize: 2,
      householdMembers: [
        {
          name: 'Jane Doe',
          age: 28,
          relationship: 'spouse',
        },
      ],
      hasAllergies: false,
      allergyDetails: undefined,
    },
    petExperience: {
      hasPetsCurrently: true,
      currentPets: [
        {
          type: 'dog',
          breed: 'Golden Retriever',
          age: 5,
          spayedNeutered: true,
          vaccinated: true,
        },
      ],
      previousPets: [
        {
          type: 'cat',
          breed: 'Domestic Shorthair',
          yearsOwned: 3,
          whatHappened: 'Passed away naturally',
        },
      ],
      experienceLevel: 'experienced',
      willingToTrain: true,
      hoursAloneDaily: 4,
      exercisePlans: 'Daily walks and playtime',
    },
    references: {
      veterinarian: {
        name: 'Dr. Smith',
        clinicName: 'Pet Care Clinic',
        phone: '555-987-6543',
        email: 'dr.smith@petcare.com',
        yearsUsed: 3,
      },
      personal: [
        {
          name: 'Alice Johnson',
          relationship: 'friend',
          phone: '555-111-2222',
          email: 'alice@example.com',
          yearsKnown: 5,
        },
      ],
    },
    additionalInfo: {
      whyAdopt: 'Want to provide a loving home',
      expectations: 'A loyal companion',
      petName: 'Buddy',
      emergencyPlan: 'Pet emergency fund available',
      agreement: true,
    },
  };

  const mockApplication: Application = {
    id: 'app-123',
    petId: 'pet-123',
    userId: 'user-123',
    rescueId: 'rescue-123',
    status: 'pending' as ApplicationStatus,
    submittedAt: '2024-01-01T00:00:00Z',
    reviewedAt: '',
    reviewedBy: '',
    reviewNotes: '',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    data: mockApplicationData,
    documents: [],
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock ApiService instance
    mockApiService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      updateConfig: jest.fn(),
    } as unknown as jest.Mocked<ApiService>;

    // Mock the ApiService constructor
    (ApiService as jest.MockedClass<typeof ApiService>).mockImplementation(() => mockApiService);

    // Create service instance
    applicationsService = new ApplicationsService();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(applicationsService).toBeInstanceOf(ApplicationsService);
    });

    it('should create instance with custom config', () => {
      const customConfig = { apiUrl: 'http://test.com', debug: true };
      const service = new ApplicationsService(mockApiService, customConfig);
      expect(service).toBeInstanceOf(ApplicationsService);
    });
  });

  describe('submitApplication', () => {
    it('should submit application successfully', async () => {
      mockApiService.post.mockResolvedValue({ data: mockApplication });

      const result = await applicationsService.submitApplication(mockApplicationData);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/applications', mockApplicationData);
      expect(result).toEqual(mockApplication);
    });

    it('should handle submit error', async () => {
      const error = new Error('Submit failed');
      mockApiService.post.mockRejectedValue(error);

      await expect(applicationsService.submitApplication(mockApplicationData)).rejects.toThrow(
        'Submit failed'
      );
    });
  });

  describe('updateApplication', () => {
    it('should update application successfully', async () => {
      const updateData = {
        personalInfo: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@example.com',
          phone: '555-123-4567',
          address: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
        },
      };
      const updatedApplication = {
        ...mockApplication,
        data: { ...mockApplicationData, ...updateData },
      };
      mockApiService.put.mockResolvedValue({ data: updatedApplication });

      const result = await applicationsService.updateApplication('app-123', updateData);

      expect(mockApiService.put).toHaveBeenCalledWith('/api/v1/applications/app-123', updateData);
      expect(result).toEqual(updatedApplication);
    });
  });

  describe('getApplicationById', () => {
    it('should get application by ID successfully', async () => {
      const mockBackendResponse = {
        data: {
          application_id: 'app-123',
          pet_id: 'pet-123',
          user_id: 'user-123',
          rescue_id: 'rescue-123',
          status: 'pending',
          submitted_at: '2024-01-01T00:00:00Z',
          reviewed_at: '',
          actioned_by: '',
          notes: '',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          answers: {},
          references: [],
          documents: [],
          Pet: {
            name: 'Buddy',
            type: 'dog',
            breed: 'Golden Retriever',
          },
        },
      };

      mockApiService.get.mockResolvedValue(mockBackendResponse);

      const result = await applicationsService.getApplicationById('app-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/applications/app-123');
      expect(result.id).toBe('app-123');
      expect((result as ApplicationWithPetInfo).petName).toBe('Buddy');
      expect((result as ApplicationWithPetInfo).petType).toBe('dog');
      expect((result as ApplicationWithPetInfo).petBreed).toBe('Golden Retriever');
    });
  });

  describe('getUserApplications', () => {
    it('should get user applications successfully', async () => {
      const mockResponse = { data: { applications: [mockApplication] } };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await applicationsService.getUserApplications('user-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/applications', {
        user_id: 'user-123',
      });
      expect(result).toEqual([mockApplication]);
    });

    it('should get all applications when no userId provided', async () => {
      const mockResponse = { data: [mockApplication] };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await applicationsService.getUserApplications();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/applications', {});
      expect(result).toEqual([mockApplication]);
    });
  });

  describe('getApplicationByPetId', () => {
    it('should get application by pet ID successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            applications: [mockApplication],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        },
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await applicationsService.getApplicationByPetId('pet-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/applications', {
        pet_id: 'pet-123',
      });
      expect(result).toEqual(mockApplication);
    });

    it('should return null when no application found', async () => {
      const mockResponse = {
        data: {
          data: {
            applications: [],
            total: 0,
            page: 1,
            totalPages: 0,
          },
        },
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await applicationsService.getApplicationByPetId('pet-123');

      expect(result).toBeNull();
    });
  });

  describe('updateApplicationStatus', () => {
    it('should update application status successfully', async () => {
      const updatedApplication = { ...mockApplication, status: 'approved' as ApplicationStatus };
      mockApiService.put.mockResolvedValue({ data: updatedApplication });

      const result = await applicationsService.updateApplicationStatus(
        'app-123',
        'approved' as ApplicationStatus,
        'Application looks good'
      );

      expect(mockApiService.put).toHaveBeenCalledWith('/api/v1/applications/app-123/status', {
        status: 'approved' as ApplicationStatus,
        notes: 'Application looks good',
      });
      expect(result).toEqual(updatedApplication);
    });
  });

  describe('withdrawApplication', () => {
    it('should withdraw application successfully', async () => {
      mockApiService.put.mockResolvedValue({});

      await applicationsService.withdrawApplication('app-123', 'Changed mind');

      expect(mockApiService.put).toHaveBeenCalledWith('/api/v1/applications/app-123/withdraw', {
        reason: 'Changed mind',
      });
    });
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const mockFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      const mockUpload: DocumentUpload = {
        id: 'doc-123',
        filename: 'document.pdf',
        type: 'id_verification',
        url: 'http://example.com/doc-123',
        uploadedAt: '2024-01-01T00:00:00Z',
      };

      mockApiService.post.mockResolvedValue({ data: mockUpload });

      const result = await applicationsService.uploadDocument(
        'app-123',
        mockFile,
        'id_verification'
      );

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/applications/app-123/documents',
        expect.any(FormData)
      );
      expect(result).toEqual(mockUpload);
    });
  });

  describe('removeDocument', () => {
    it('should remove document successfully', async () => {
      mockApiService.delete.mockResolvedValue({});

      await applicationsService.removeDocument('app-123', 'doc-123');

      expect(mockApiService.delete).toHaveBeenCalledWith(
        '/api/v1/applications/app-123/documents/doc-123'
      );
    });
  });

  describe('getDocuments', () => {
    it('should get documents successfully', async () => {
      const mockDocuments: Document[] = [
        {
          id: 'doc-123',
          applicationId: 'app-123',
          filename: 'document.pdf',
          type: 'id_verification',
          size: 1024,
          uploadedAt: '2024-01-01T00:00:00Z',
          url: 'http://example.com/doc-123',
        },
      ];

      mockApiService.get.mockResolvedValue({ data: mockDocuments });

      const result = await applicationsService.getDocuments('app-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/applications/app-123/documents');
      expect(result).toEqual(mockDocuments);
    });

    it('should handle empty documents response', async () => {
      mockApiService.get.mockResolvedValue({});

      const result = await applicationsService.getDocuments('app-123');

      expect(result).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('should update service configuration', () => {
      const newConfig = { apiUrl: 'http://newapi.com', debug: true };

      applicationsService.updateConfig(newConfig);

      expect(mockApiService.updateConfig).toHaveBeenCalledWith({ apiUrl: 'http://newapi.com' });
    });
  });
});
