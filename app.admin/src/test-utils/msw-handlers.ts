import { http, HttpResponse } from 'msw';

// Mock data for admin app
const mockUsers = [
  {
    userId: 'user1',
    email: 'adopter@example.com',
    firstName: 'John',
    lastName: 'Doe',
    userType: 'adopter',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    userId: 'user2',
    email: 'rescue@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    userType: 'rescue_staff',
    status: 'active',
    createdAt: '2024-01-02T00:00:00Z',
  },
];

const mockRescues = [
  {
    rescueId: 'rescue1',
    name: 'Happy Paws Rescue',
    status: 'verified',
    email: 'contact@happypaws.org',
    phone: '555-0100',
    city: 'San Francisco',
    state: 'CA',
  },
  {
    rescueId: 'rescue2',
    name: 'Cat Haven',
    status: 'pending',
    email: 'info@cathaven.org',
    phone: '555-0200',
    city: 'Los Angeles',
    state: 'CA',
  },
];

const mockReports = [
  {
    reportId: 'report1',
    type: 'inappropriate_content',
    status: 'pending',
    description: 'Inappropriate pet photo',
    reportedBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

export const mswHandlers = [
  // User management endpoints
  http.get('/api/v1/admin/users', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json({
      success: true,
      data: {
        users: mockUsers,
        pagination: {
          page,
          limit,
          total: mockUsers.length,
          totalPages: 1,
        },
      },
    });
  }),

  http.get('/api/v1/admin/users/:userId', ({ params }) => {
    const user = mockUsers.find(u => u.userId === params.userId);

    if (!user) {
      return HttpResponse.json(
        {
          success: false,
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: user,
    });
  }),

  http.patch('/api/v1/admin/users/:userId/status', async ({ params, request }) => {
    const body = (await request.json()) as { status: string };
    const user = mockUsers.find(u => u.userId === params.userId);

    if (!user) {
      return HttpResponse.json(
        {
          success: false,
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'User status updated successfully',
      data: { ...user, status: body.status },
    });
  }),

  // Rescue management endpoints
  http.get('/api/v1/admin/rescues', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filteredRescues = mockRescues;
    if (status) {
      filteredRescues = mockRescues.filter(r => r.status === status);
    }

    return HttpResponse.json({
      success: true,
      data: {
        rescues: filteredRescues,
        pagination: {
          page: 1,
          limit: 10,
          total: filteredRescues.length,
          totalPages: 1,
        },
      },
    });
  }),

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
      data: { ...rescue, status: 'verified' },
    });
  }),

  // Moderation endpoints
  http.get('/api/v1/admin/reports', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filteredReports = mockReports;
    if (status) {
      filteredReports = mockReports.filter(r => r.status === status);
    }

    return HttpResponse.json({
      success: true,
      data: {
        reports: filteredReports,
        pagination: {
          page: 1,
          limit: 10,
          total: filteredReports.length,
          totalPages: 1,
        },
      },
    });
  }),

  http.post('/api/v1/admin/reports/:reportId/resolve', async ({ params, request }) => {
    const body = (await request.json()) as { action: string; notes?: string };
    const report = mockReports.find(r => r.reportId === params.reportId);

    if (!report) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Report not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Report resolved successfully',
      data: { ...report, status: 'resolved' },
    });
  }),

  // Analytics endpoints
  http.get('/api/v1/admin/analytics/overview', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalUsers: 1250,
        totalRescues: 45,
        totalPets: 320,
        totalAdoptions: 189,
        pendingReports: 5,
        activeUsers: 856,
      },
    });
  }),
];
