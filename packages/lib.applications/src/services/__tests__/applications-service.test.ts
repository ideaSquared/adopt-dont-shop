import { ApplicationsService } from '../applications-service';
import { ApiService } from '@adopt-dont-shop/lib.api';
import type {
  ApplicationData,
  Application,
  ApplicationWithPetInfo,
  DocumentUpload,
  Document,
} from '../../types';

// Mock the ApiService
vi.mock('@adopt-dont-shop/lib.api');

describe('ApplicationsService', () => {
  let applicationsService: ApplicationsService;
  let mockApiService: vi.Mocked<ApiService>;

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
    livingConditions: {
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
    status: 'submitted',
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
    vi.clearAllMocks();

    // Create mock ApiService instance
    mockApiService = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      updateConfig: vi.fn(),
    } as unknown as vi.Mocked<ApiService>;

    // Mock the ApiService constructor
    (ApiService as vi.MockedClass<typeof ApiService>).mockImplementation(function () {
      return mockApiService;
    });

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
          id: 'app-123',
          petId: 'pet-123',
          userId: 'user-123',
          rescueId: 'rescue-123',
          status: 'submitted',
          submittedAt: '2024-01-01T00:00:00Z',
          reviewedAt: '',
          reviewedBy: '',
          reviewNotes: '',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          documents: [],
          petName: 'Buddy',
          petType: 'dog',
          petBreed: 'Golden Retriever',
        },
      };

      mockApiService.get.mockResolvedValue(mockBackendResponse);

      const result = await applicationsService.getApplicationById('app-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/applications/app-123');
      expect(result.id).toBe('app-123');
      expect(result.petName).toBe('Buddy');
      expect(result.petType).toBe('dog');
      expect(result.petBreed).toBe('Golden Retriever');
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

    // Regression: the backend's transformApplicationModel surfaces nullable
    // columns (submittedAt / reviewedAt / actionedBy / notes) as JSON `null`,
    // not as absent keys. A `.optional()` schema would reject these and the
    // adopter dashboard would show "Error loading applications" instead of
    // the My Applications heading.
    it('parses applications whose nullable date and reviewer columns come back as null', async () => {
      const applicationWithNulls = {
        id: 'app-456',
        petId: 'pet-456',
        userId: 'user-123',
        rescueId: 'rescue-123',
        status: 'submitted',
        submittedAt: null,
        reviewedAt: null,
        reviewedBy: null,
        reviewNotes: null,
        data: {
          personalInfo: {
            firstName: 'New',
            lastName: 'Adopter',
            email: 'new@example.com',
          },
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApiService.get.mockResolvedValue({ data: [applicationWithNulls] });

      const result = await applicationsService.getUserApplications();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('app-456');
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
      const updatedApplication = { ...mockApplication, status: 'approved' as const };
      mockApiService.patch.mockResolvedValue({ data: updatedApplication });

      const result = await applicationsService.updateApplicationStatus(
        'app-123',
        'approved',
        'Application looks good'
      );

      expect(mockApiService.patch).toHaveBeenCalledWith('/api/v1/applications/app-123/status', {
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

    it('does not touch the api client when no apiUrl is supplied', () => {
      applicationsService.updateConfig({ debug: true });

      expect(mockApiService.updateConfig).not.toHaveBeenCalled();
    });
  });

  describe('getApplicationByPetId', () => {
    // Behaviour: looking up an adopter's application for a pet must never break
    // the pet detail page. Any backend failure is swallowed and reported as
    // "no application", letting the page render an Apply button instead of error.
    it('returns null when the lookup request fails', async () => {
      mockApiService.get.mockRejectedValue(new Error('network down'));

      const result = await applicationsService.getApplicationByPetId('pet-123');

      expect(result).toBeNull();
    });

    it('returns null when the response envelope omits the inner data', async () => {
      mockApiService.get.mockResolvedValue({ data: {} });

      const result = await applicationsService.getApplicationByPetId('pet-123');

      expect(result).toBeNull();
    });
  });

  describe('getUserApplications', () => {
    it('returns an empty list when the backend omits the data envelope', async () => {
      mockApiService.get.mockResolvedValue({});

      const result = await applicationsService.getUserApplications('user-123');

      expect(result).toEqual([]);
    });

    it('propagates errors so the dashboard can show a load failure', async () => {
      mockApiService.get.mockRejectedValue(new Error('boom'));

      await expect(applicationsService.getUserApplications()).rejects.toThrow('boom');
    });
  });

  describe('updateApplicationStatus', () => {
    it('sends an undefined notes value when none is supplied', async () => {
      mockApiService.patch.mockResolvedValue({ data: mockApplication });

      await applicationsService.updateApplicationStatus('app-123', 'rejected');

      expect(mockApiService.patch).toHaveBeenCalledWith('/api/v1/applications/app-123/status', {
        status: 'rejected',
        notes: undefined,
      });
    });
  });

  describe('withdrawApplication', () => {
    it('withdraws without a reason when none is given', async () => {
      mockApiService.put.mockResolvedValue({});

      await applicationsService.withdrawApplication('app-123');

      expect(mockApiService.put).toHaveBeenCalledWith('/api/v1/applications/app-123/withdraw', {
        reason: undefined,
      });
    });

    it('surfaces withdrawal failures to the caller', async () => {
      mockApiService.put.mockRejectedValue(new Error('cannot withdraw'));

      await expect(applicationsService.withdrawApplication('app-123')).rejects.toThrow(
        'cannot withdraw'
      );
    });
  });

  describe('getRescueApplications', () => {
    const rescueResponse = {
      success: true,
      data: [mockApplication],
      meta: { total: 1, page: 1, totalPages: 1, hasNext: false, hasPrev: false },
    };

    it('fetches a rescue queue with no filters', async () => {
      mockApiService.get.mockResolvedValue(rescueResponse);

      const result = await applicationsService.getRescueApplications();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/applications');
      expect(result).toEqual([mockApplication]);
    });

    it('builds a query string from every supplied filter', async () => {
      mockApiService.get.mockResolvedValue(rescueResponse);

      await applicationsService.getRescueApplications('rescue-123', {
        status: 'submitted',
        search: 'buddy',
        limit: 10,
        offset: 20,
      });

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/v1/applications?rescueId=rescue-123&status=submitted&search=buddy&limit=10&offset=20'
      );
    });

    it('includes only the rescueId when other filters are absent', async () => {
      mockApiService.get.mockResolvedValue(rescueResponse);

      await applicationsService.getRescueApplications('rescue-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/applications?rescueId=rescue-123');
    });

    it('propagates errors from the rescue queue request', async () => {
      mockApiService.get.mockRejectedValue(new Error('forbidden'));

      await expect(applicationsService.getRescueApplications('rescue-123')).rejects.toThrow(
        'forbidden'
      );
    });
  });

  describe('getApplicationStats', () => {
    const stats = {
      total: 5,
      submitted: 2,
      underReview: 1,
      approved: 1,
      rejected: 1,
      pendingReferences: 0,
    };

    it('fetches global stats when no rescue is scoped', async () => {
      mockApiService.get.mockResolvedValue({ data: stats });

      const result = await applicationsService.getApplicationStats();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/applications/stats');
      expect(result).toEqual(stats);
    });

    it('scopes stats to a rescue via query string', async () => {
      mockApiService.get.mockResolvedValue({ data: stats });

      await applicationsService.getApplicationStats('rescue-123');

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/v1/applications/stats?rescueId=rescue-123'
      );
    });

    it('defaults every counter to zero when the backend returns no data', async () => {
      mockApiService.get.mockResolvedValue({});

      const result = await applicationsService.getApplicationStats();

      expect(result).toEqual({
        total: 0,
        submitted: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
        pendingReferences: 0,
      });
    });

    it('propagates errors from the stats request', async () => {
      mockApiService.get.mockRejectedValue(new Error('stats unavailable'));

      await expect(applicationsService.getApplicationStats()).rejects.toThrow('stats unavailable');
    });
  });

  describe('debug logging', () => {
    // When debug is enabled, failures are logged to the console before being
    // rethrown. Observable behaviour: the error still propagates AND a log is
    // written, so operators get a breadcrumb without changing control flow.
    it('logs the failure when debug mode is on, then rethrows', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const debugService = new ApplicationsService(mockApiService, { debug: true });
      mockApiService.post.mockRejectedValue(new Error('debug failure'));

      await expect(debugService.submitApplication(mockApplicationData)).rejects.toThrow(
        'debug failure'
      );
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    // Every public method shares the same debug-logging contract: on failure it
    // writes one console.error breadcrumb. Drive each one through its catch so
    // the contract is documented uniformly rather than per-method.
    it('logs a breadcrumb for every failing operation in debug mode', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const debugService = new ApplicationsService(mockApiService, { debug: true });
      const failure = new Error('downstream failure');
      mockApiService.get.mockRejectedValue(failure);
      mockApiService.post.mockRejectedValue(failure);
      mockApiService.put.mockRejectedValue(failure);
      mockApiService.patch.mockRejectedValue(failure);
      mockApiService.delete.mockRejectedValue(failure);

      const file = new File(['x'], 'id.pdf', { type: 'application/pdf' });

      await expect(debugService.updateApplication('app-1', {})).rejects.toThrow();
      await expect(debugService.getApplicationById('app-1')).rejects.toThrow();
      await expect(debugService.getUserApplications()).rejects.toThrow();
      await expect(debugService.updateApplicationStatus('app-1', 'approved')).rejects.toThrow();
      await expect(debugService.withdrawApplication('app-1')).rejects.toThrow();
      await expect(debugService.uploadDocument('app-1', file, 'id')).rejects.toThrow();
      await expect(debugService.removeDocument('app-1', 'doc-1')).rejects.toThrow();
      await expect(debugService.getDocuments('app-1')).rejects.toThrow();
      await expect(debugService.getRescueApplications()).rejects.toThrow();
      await expect(debugService.getApplicationStats()).rejects.toThrow();
      // getApplicationByPetId swallows the error and returns null, but still logs.
      await expect(debugService.getApplicationByPetId('pet-1')).resolves.toBeNull();

      expect(consoleError).toHaveBeenCalledTimes(11);

      consoleError.mockRestore();
    });
  });
});
