import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';

vi.mock('../../services/application.service');
vi.mock('../../services/file-upload.service');
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
  },
}));

import { Request, Response } from 'express';
import { ApplicationController } from '../../controllers/application.controller';
import { ApplicationService } from '../../services/application.service';
import { FileUploadService } from '../../services/file-upload.service';

interface AuthenticatedRequest extends Request {
  user?: { userId: string };
}

describe('ApplicationController — document upload behaviour', () => {
  let controller: ApplicationController;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  const mockUser = { userId: 'user-123' };

  const makeMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'proof-of-residence.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('pdf-content'),
    size: 102_400,
    destination: '/uploads/applications',
    filename: 'applications_1234_uuid.pdf',
    path: '/uploads/applications/applications_1234_uuid.pdf',
    stream: null as unknown as NodeJS.ReadableStream,
    ...overrides,
  });

  const mockUploadResult = {
    success: true,
    upload: {
      upload_id: 'upload-abc',
      original_filename: 'proof-of-residence.pdf',
      url: '/uploads/applications/applications_1234_uuid.pdf',
      mime_type: 'application/pdf',
      file_size: 102_400,
    },
  };

  const mockApplication = {
    applicationId: 'app-001',
    userId: 'user-123',
    documents: [],
    toJSON: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    controller = new ApplicationController();

    mockRequest = {
      user: mockUser,
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
  });

  describe('addDocument — uploading a file to an application', () => {
    describe('when a valid file is uploaded', () => {
      it('stores the file and attaches it to the application', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = { documentType: 'PROOF_OF_RESIDENCE' };
        mockRequest.file = makeMockFile();

        (FileUploadService.uploadFile as Mock).mockResolvedValue(mockUploadResult);
        (ApplicationService.addDocument as Mock).mockResolvedValue(mockApplication);

        await controller.addDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(FileUploadService.uploadFile).toHaveBeenCalledWith(
          mockRequest.file,
          'applications',
          expect.objectContaining({
            uploadedBy: 'user-123',
            entityId: 'app-001',
            entityType: 'application',
            purpose: 'document',
          })
        );

        expect(ApplicationService.addDocument).toHaveBeenCalledWith(
          'app-001',
          expect.objectContaining({
            documentType: 'PROOF_OF_RESIDENCE',
            fileName: 'proof-of-residence.pdf',
            fileUrl: '/uploads/applications/applications_1234_uuid.pdf',
          }),
          'user-123'
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            document: expect.objectContaining({
              fileName: 'proof-of-residence.pdf',
            }),
          })
        );
      });

      it('defaults the document type to OTHER when not specified', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.body = {};
        mockRequest.file = makeMockFile();

        (FileUploadService.uploadFile as Mock).mockResolvedValue(mockUploadResult);
        (ApplicationService.addDocument as Mock).mockResolvedValue(mockApplication);

        await controller.addDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ApplicationService.addDocument).toHaveBeenCalledWith(
          'app-001',
          expect.objectContaining({ documentType: 'OTHER' }),
          'user-123'
        );
      });
    });

    describe('when no file is included in the request', () => {
      it('returns 400 with a helpful message listing supported formats', async () => {
        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.file = undefined;

        await controller.addDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringMatching(/PDF|JPG|PNG/i),
          })
        );
        expect(FileUploadService.uploadFile).not.toHaveBeenCalled();
      });
    });

    describe('when the application does not exist', () => {
      it('returns 404', async () => {
        mockRequest.params = { applicationId: 'nonexistent' };
        mockRequest.file = makeMockFile();

        (FileUploadService.uploadFile as Mock).mockResolvedValue(mockUploadResult);
        (ApplicationService.addDocument as Mock).mockRejectedValue(
          new Error('Application not found')
        );

        await controller.addDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });

    describe('when the user does not own the application', () => {
      it('returns 403', async () => {
        mockRequest.params = { applicationId: 'app-other' };
        mockRequest.file = makeMockFile();

        (FileUploadService.uploadFile as Mock).mockResolvedValue(mockUploadResult);
        (ApplicationService.addDocument as Mock).mockRejectedValue(new Error('Access denied'));

        await controller.addDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
      });
    });

    describe('when the file storage service fails', () => {
      it('returns 500 without leaking internal details in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        mockRequest.params = { applicationId: 'app-001' };
        mockRequest.file = makeMockFile();

        (FileUploadService.uploadFile as Mock).mockResolvedValue({
          success: false,
          upload: null,
        });

        await controller.addDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        const jsonCall = (mockResponse.json as Mock).mock.calls[0][0];
        expect(jsonCall.error).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('removeDocument — deleting a document from an application', () => {
    describe('when the document exists and belongs to the applicant', () => {
      it('removes the document and confirms success', async () => {
        mockRequest.params = { applicationId: 'app-001', documentId: 'doc-xyz' };

        (ApplicationService.removeDocument as Mock).mockResolvedValue(undefined);

        await controller.removeDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ApplicationService.removeDocument).toHaveBeenCalledWith(
          'app-001',
          'doc-xyz',
          'user-123'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true })
        );
      });
    });

    describe('when the document does not exist', () => {
      it('returns 404', async () => {
        mockRequest.params = { applicationId: 'app-001', documentId: 'missing-doc' };

        (ApplicationService.removeDocument as Mock).mockRejectedValue(
          new Error('Document not found')
        );

        await controller.removeDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });

    describe('when the user does not own the application', () => {
      it('returns 403', async () => {
        mockRequest.params = { applicationId: 'app-other', documentId: 'doc-xyz' };

        (ApplicationService.removeDocument as Mock).mockRejectedValue(
          new Error('Access denied')
        );

        await controller.removeDocument(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
      });
    });
  });
});
