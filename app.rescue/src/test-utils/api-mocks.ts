/**
 * API mocking utilities for testing
 * Provides helpers to mock API responses, errors, and loading states
 */

import { rest } from 'msw';
import { setupServer } from 'msw/node';

const API_BASE_URL = 'http://localhost:5000';

/**
 * Create MSW server for API mocking
 */
export const server = setupServer();

/**
 * Mock successful API response
 */
export const mockApiSuccess = <T>(
  endpoint: string,
  data: T,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' = 'get'
): void => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  server.use(
    rest[method](url, (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({ data })
      );
    })
  );
};

/**
 * Mock API error response
 */
export const mockApiError = (
  endpoint: string,
  error: { message: string; statusCode?: number },
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' = 'get'
): void => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const statusCode = error.statusCode || 500;

  server.use(
    rest[method](url, (_req, res, ctx) => {
      return res(
        ctx.status(statusCode),
        ctx.json({ error: error.message })
      );
    })
  );
};

/**
 * Mock API loading (delayed response)
 */
export const mockApiLoading = (
  endpoint: string,
  delay: number = 10000,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' = 'get'
): void => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  server.use(
    rest[method](url, async (_req, res, ctx) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return res(ctx.status(200), ctx.json({ data: [] }));
    })
  );
};

/**
 * Mock paginated API response
 */
export const mockPaginatedApiSuccess = <T>(
  endpoint: string,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
): void => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  server.use(
    rest.get(url, (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          data,
          pagination: {
            ...pagination,
            totalPages: Math.ceil(pagination.total / pagination.limit),
          },
        })
      );
    })
  );
};

/**
 * Reset all API mocks
 */
export const resetApiMocks = (): void => {
  server.resetHandlers();
};

/**
 * Start API mock server
 */
export const startApiMockServer = (): void => {
  server.listen({ onUnhandledRequest: 'warn' });
};

/**
 * Stop API mock server
 */
export const stopApiMockServer = (): void => {
  server.close();
};

/**
 * Mock dashboard API endpoints
 */
export const mockDashboardApi = (data: unknown): void => {
  mockApiSuccess('/api/v1/rescue/dashboard', data);
};

/**
 * Mock pets API endpoints
 */
export const mockPetsApi = {
  list: (pets: unknown[]): void => {
    mockPaginatedApiSuccess('/api/v1/rescue/pets', pets, {
      page: 1,
      limit: 12,
      total: pets.length,
    });
  },
  get: (petId: string, pet: unknown): void => {
    mockApiSuccess(`/api/v1/rescue/pets/${petId}`, pet);
  },
  create: (pet: unknown): void => {
    mockApiSuccess('/api/v1/rescue/pets', pet, 'post');
  },
  update: (petId: string, pet: unknown): void => {
    mockApiSuccess(`/api/v1/rescue/pets/${petId}`, pet, 'put');
  },
  delete: (petId: string): void => {
    mockApiSuccess(`/api/v1/rescue/pets/${petId}`, { success: true }, 'delete');
  },
};

/**
 * Mock applications API endpoints
 */
export const mockApplicationsApi = {
  list: (applications: unknown[]): void => {
    mockPaginatedApiSuccess('/api/v1/rescue/applications', applications, {
      page: 1,
      limit: 20,
      total: applications.length,
    });
  },
  get: (applicationId: string, application: unknown): void => {
    mockApiSuccess(`/api/v1/rescue/applications/${applicationId}`, application);
  },
  updateStatus: (applicationId: string, application: unknown): void => {
    mockApiSuccess(`/api/v1/rescue/applications/${applicationId}/status`, application, 'patch');
  },
  updateStage: (applicationId: string, application: unknown): void => {
    mockApiSuccess(`/api/v1/rescue/applications/${applicationId}/stage`, application, 'patch');
  },
  timeline: (applicationId: string, timeline: unknown[]): void => {
    mockApiSuccess(`/api/v1/rescue/applications/${applicationId}/timeline`, timeline);
  },
};

/**
 * Mock staff API endpoints
 */
export const mockStaffApi = {
  list: (staff: unknown[]): void => {
    mockApiSuccess('/api/v1/rescue/staff', staff);
  },
  invite: (invitation: unknown): void => {
    mockApiSuccess('/api/v1/rescue/staff/invite', invitation, 'post');
  },
  pendingInvitations: (invitations: unknown[]): void => {
    mockApiSuccess('/api/v1/rescue/invitations/pending', invitations);
  },
  resendInvitation: (invitationId: string): void => {
    mockApiSuccess(`/api/v1/rescue/invitations/${invitationId}/resend`, { success: true }, 'post');
  },
  cancelInvitation: (invitationId: string): void => {
    mockApiSuccess(`/api/v1/rescue/invitations/${invitationId}`, { success: true }, 'delete');
  },
  update: (staffId: string, staff: unknown): void => {
    mockApiSuccess(`/api/v1/rescue/staff/${staffId}`, staff, 'put');
  },
  remove: (staffId: string): void => {
    mockApiSuccess(`/api/v1/rescue/staff/${staffId}`, { success: true }, 'delete');
  },
};

/**
 * Mock events API endpoints
 */
export const mockEventsApi = {
  list: (events: unknown[]): void => {
    mockApiSuccess('/api/v1/rescue/events', events);
  },
  get: (eventId: string, event: unknown): void => {
    mockApiSuccess(`/api/v1/rescue/events/${eventId}`, event);
  },
  create: (event: unknown): void => {
    mockApiSuccess('/api/v1/rescue/events', event, 'post');
  },
  update: (eventId: string, event: unknown): void => {
    mockApiSuccess(`/api/v1/rescue/events/${eventId}`, event, 'put');
  },
  delete: (eventId: string): void => {
    mockApiSuccess(`/api/v1/rescue/events/${eventId}`, { success: true }, 'delete');
  },
};

/**
 * Mock chat API endpoints
 */
export const mockChatApi = {
  conversations: (conversations: unknown[]): void => {
    mockApiSuccess('/api/v1/rescue/conversations', conversations);
  },
  messages: (conversationId: string, messages: unknown[]): void => {
    mockApiSuccess(`/api/v1/rescue/conversations/${conversationId}/messages`, messages);
  },
  sendMessage: (conversationId: string, message: unknown): void => {
    mockApiSuccess(`/api/v1/rescue/conversations/${conversationId}/messages`, message, 'post');
  },
};

/**
 * Mock analytics API endpoints
 */
export const mockAnalyticsApi = {
  overview: (analytics: unknown): void => {
    mockApiSuccess('/api/v1/rescue/analytics', analytics);
  },
  adoptionTrends: (trends: unknown[]): void => {
    mockApiSuccess('/api/v1/rescue/analytics/adoption-trends', trends);
  },
  stageDistribution: (distribution: unknown[]): void => {
    mockApiSuccess('/api/v1/rescue/analytics/stage-distribution', distribution);
  },
};

/**
 * Mock invitation acceptance API
 */
export const mockInvitationApi = {
  validate: (token: string, invitation: unknown): void => {
    mockApiSuccess(`/api/v1/invitations/validate/${token}`, invitation);
  },
  accept: (token: string, user: unknown): void => {
    mockApiSuccess(`/api/v1/invitations/accept/${token}`, user, 'post');
  },
};
