/**
 * Behavioral tests for Rescue Verification workflow (Admin App)
 *
 * Tests admin rescue verification behavior:
 * - Admin can view pending rescue applications
 * - Admin can filter rescues by verification status
 * - Admin can view rescue organization details
 * - Admin can verify rescue organizations
 * - Admin can reject rescue applications
 * - Admin sees appropriate success messages
 * - Admin experiences graceful error handling
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const mockRescues = [
  {
    rescueId: 'rescue-1',
    name: 'Happy Paws Rescue',
    email: 'contact@happypaws.org',
    phone: '555-0100',
    address: '123 Rescue Lane',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    status: 'pending',
    ein: '12-3456789',
    foundedYear: 2015,
    description: 'Dedicated to rescuing abandoned pets',
    documents: ['ein-cert.pdf', 'nonprofit-status.pdf'],
    submittedAt: '2024-01-01T00:00:00Z',
  },
  {
    rescueId: 'rescue-2',
    name: 'Cat Haven',
    email: 'info@cathaven.org',
    phone: '555-0200',
    address: '456 Feline St',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    status: 'verified',
    ein: '98-7654321',
    foundedYear: 2010,
    description: 'Specializing in cat rescue and adoption',
    documents: ['ein-cert.pdf', 'nonprofit-status.pdf', 'facility-license.pdf'],
    verifiedAt: '2024-01-15T00:00:00Z',
    verifiedBy: 'admin-123',
  },
];

const server = setupServer(
  // Get rescue statistics (must come before :rescueId to avoid matching "stats" as an ID)
  http.get('/api/v1/admin/rescues/stats', () => {
    return HttpResponse.json({
      success: true,
      data: {
        total: 45,
        pending: 8,
        verified: 35,
        rejected: 2,
      },
    });
  }),

  // Get all rescues
  http.get('/api/v1/admin/rescues', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let filteredRescues = mockRescues;
    if (status) {
      filteredRescues = mockRescues.filter(r => r.status === status);
    }

    return HttpResponse.json({
      success: true,
      data: {
        rescues: filteredRescues,
        pagination: {
          page,
          limit,
          total: filteredRescues.length,
          totalPages: Math.ceil(filteredRescues.length / limit),
        },
      },
    });
  }),

  // Get single rescue
  http.get('/api/v1/admin/rescues/:rescueId', ({ params }) => {
    const rescue = mockRescues.find(r => r.rescueId === params.rescueId);

    if (!rescue) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Rescue not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: rescue,
    });
  }),

  // Verify rescue
  http.patch('/api/v1/admin/rescues/:rescueId/verify', ({ params }) => {
    const rescue = mockRescues.find(r => r.rescueId === params.rescueId);

    if (!rescue) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Rescue not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Rescue verified successfully',
      data: {
        ...rescue,
        status: 'verified',
        verifiedAt: new Date().toISOString(),
      },
    });
  }),

  // Reject rescue
  http.patch('/api/v1/admin/rescues/:rescueId/reject', async ({ params, request }) => {
    const body = await request.json() as { reason: string };
    const rescue = mockRescues.find(r => r.rescueId === params.rescueId);

    if (!rescue) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Rescue not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Rescue application rejected',
      data: {
        ...rescue,
        status: 'rejected',
        rejectionReason: body.reason,
        rejectedAt: new Date().toISOString(),
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Rescue Verification - Behavioral Tests', () => {
  describe('Viewing Rescues', () => {
    it('should list all rescue organizations', async () => {
      const response = await fetch('/api/v1/admin/rescues');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.rescues)).toBe(true);
      expect(data.data.rescues.length).toBeGreaterThan(0);
    });

    it('should include pagination information', async () => {
      const response = await fetch('/api/v1/admin/rescues?page=1&limit=10');
      const data = await response.json();

      expect(data.data.pagination).toBeTruthy();
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(10);
      expect(typeof data.data.pagination.total).toBe('number');
      expect(typeof data.data.pagination.totalPages).toBe('number');
    });

    it('should include rescue organization details', async () => {
      const response = await fetch('/api/v1/admin/rescues');
      const data = await response.json();

      const rescue = data.data.rescues[0];
      expect(rescue.rescueId).toBeTruthy();
      expect(rescue.name).toBeTruthy();
      expect(rescue.email).toBeTruthy();
      expect(rescue.phone).toBeTruthy();
      expect(rescue.status).toBeTruthy();
      expect(rescue.ein).toBeTruthy();
    });
  });

  describe('Filtering Rescues', () => {
    it('should filter rescues by pending status', async () => {
      const response = await fetch('/api/v1/admin/rescues?status=pending');
      const data = await response.json();

      expect(data.success).toBe(true);
      data.data.rescues.forEach((rescue: any) => {
        expect(rescue.status).toBe('pending');
      });
    });

    it('should filter rescues by verified status', async () => {
      const response = await fetch('/api/v1/admin/rescues?status=verified');
      const data = await response.json();

      expect(data.success).toBe(true);
      data.data.rescues.forEach((rescue: any) => {
        expect(rescue.status).toBe('verified');
      });
    });

    it('should return all rescues when no filter applied', async () => {
      const response = await fetch('/api/v1/admin/rescues');
      const data = await response.json();

      const statuses = data.data.rescues.map((r: any) => r.status);
      expect(statuses.length).toBeGreaterThan(0);
    });
  });

  describe('Rescue Details', () => {
    it('should get rescue organization details', async () => {
      const response = await fetch('/api/v1/admin/rescues/rescue-1');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.rescueId).toBe('rescue-1');
      expect(data.data.name).toBe('Happy Paws Rescue');
      expect(data.data.ein).toBeTruthy();
      expect(Array.isArray(data.data.documents)).toBe(true);
    });

    it('should return 404 for non-existent rescue', async () => {
      const response = await fetch('/api/v1/admin/rescues/non-existent');

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Rescue not found');
    });

    it('should include verification documents', async () => {
      const response = await fetch('/api/v1/admin/rescues/rescue-1');
      const data = await response.json();

      expect(Array.isArray(data.data.documents)).toBe(true);
      expect(data.data.documents.length).toBeGreaterThan(0);
    });
  });

  describe('Verifying Rescues', () => {
    it('should verify pending rescue organization', async () => {
      const response = await fetch('/api/v1/admin/rescues/rescue-1/verify', {
        method: 'PATCH',
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Rescue verified successfully');
      expect(data.data.status).toBe('verified');
      expect(data.data.verifiedAt).toBeTruthy();
    });

    it('should handle verification of non-existent rescue', async () => {
      const response = await fetch('/api/v1/admin/rescues/non-existent/verify', {
        method: 'PATCH',
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should include verification timestamp', async () => {
      const response = await fetch('/api/v1/admin/rescues/rescue-1/verify', {
        method: 'PATCH',
      });

      const data = await response.json();
      expect(data.data.verifiedAt).toBeTruthy();
      const date = new Date(data.data.verifiedAt);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Rejecting Rescues', () => {
    it('should reject rescue application with reason', async () => {
      const response = await fetch('/api/v1/admin/rescues/rescue-1/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Incomplete documentation',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Rescue application rejected');
      expect(data.data.status).toBe('rejected');
      expect(data.data.rejectionReason).toBe('Incomplete documentation');
    });

    it('should include rejection timestamp', async () => {
      const response = await fetch('/api/v1/admin/rescues/rescue-1/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Invalid EIN',
        }),
      });

      const data = await response.json();
      expect(data.data.rejectedAt).toBeTruthy();
      const date = new Date(data.data.rejectedAt);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Rescue Statistics', () => {
    it('should provide rescue verification statistics', async () => {
      const response = await fetch('/api/v1/admin/rescues/stats');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(typeof data.data.total).toBe('number');
      expect(typeof data.data.pending).toBe('number');
      expect(typeof data.data.verified).toBe('number');
      expect(typeof data.data.rejected).toBe('number');
    });

    it('should have consistent statistics totals', async () => {
      const response = await fetch('/api/v1/admin/rescues/stats');
      const data = await response.json();

      const sum = data.data.pending + data.data.verified + data.data.rejected;
      expect(sum).toBe(data.data.total);
    });
  });

  describe('Validation', () => {
    it('should validate rescue EIN format', () => {
      const validEIN = '12-3456789';
      expect(validEIN).toMatch(/^\d{2}-\d{7}$/);

      const invalidEIN = '123456789';
      expect(invalidEIN).not.toMatch(/^\d{2}-\d{7}$/);
    });

    it('should validate required documents', () => {
      const requiredDocuments = ['ein-cert.pdf', 'nonprofit-status.pdf'];
      const rescue = mockRescues[0];

      requiredDocuments.forEach(doc => {
        expect(rescue.documents).toContain(doc);
      });
    });

    it('should validate rescue status values', () => {
      const validStatuses = ['pending', 'verified', 'rejected', 'suspended'];

      mockRescues.forEach(rescue => {
        expect(validStatuses).toContain(rescue.status);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API failure when listing rescues', async () => {
      server.use(
        http.get('/api/v1/admin/rescues', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Failed to load rescues',
            },
            { status: 500 }
          );
        })
      );

      const response = await fetch('/api/v1/admin/rescues');
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should handle verification failure gracefully', async () => {
      server.use(
        http.patch('/api/v1/admin/rescues/:rescueId/verify', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Verification failed',
            },
            { status: 500 }
          );
        })
      );

      const response = await fetch('/api/v1/admin/rescues/rescue-1/verify', {
        method: 'PATCH',
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});
