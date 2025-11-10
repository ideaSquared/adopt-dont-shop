import { http, HttpResponse } from 'msw';

// Mock data
const mockPets = [
  {
    petId: 'pet1',
    name: 'Buddy',
    type: 'dog',
    breed: 'Golden Retriever',
    ageGroup: 'adult',
    size: 'large',
    gender: 'male',
    images: ['image1.jpg'],
    rescueName: 'Test Rescue',
    rescueId: 'rescue1',
    description: 'A friendly golden retriever looking for a home',
    temperament: ['friendly', 'active'],
    goodWith: ['children', 'dogs'],
  },
  {
    petId: 'pet2',
    name: 'Whiskers',
    type: 'cat',
    breed: 'Persian',
    ageGroup: 'senior',
    size: 'medium',
    gender: 'female',
    images: ['image2.jpg'],
    rescueName: 'Cat Rescue',
    rescueId: 'rescue2',
    description: 'A gentle senior cat who loves to cuddle',
    temperament: ['calm', 'affectionate'],
    goodWith: ['adults'],
  },
];

const mockUser = {
  userId: 'user1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  profileComplete: true,
};

const mockRescues = [
  {
    rescueId: 'rescue1',
    name: 'Test Rescue',
    email: 'rescue@test.com',
    phone: '555-1234',
    description: 'A wonderful rescue organization',
    location: 'Test City, TS',
  },
  {
    rescueId: 'rescue2',
    name: 'Cat Rescue',
    email: 'cats@rescue.com',
    phone: '555-5678',
    description: 'Specializing in cat adoptions',
    location: 'Cat City, CC',
  },
];

// In-memory storage for test data
let favorites: string[] = [];
let applications: Array<{
  applicationId: string;
  petId: string;
  userId: string;
  status: string;
  submittedAt: string;
  data: unknown;
}> = [];
let authToken: string | null = null;

export const mswHandlers = [
  // ===== Authentication Endpoints =====
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === 'test@example.com' && body.password === 'password123') {
      authToken = 'mock-auth-token-123';
      return HttpResponse.json({
        success: true,
        message: 'Login successful',
        data: {
          user: mockUser,
          token: authToken,
        },
      });
    }

    return HttpResponse.json(
      {
        success: false,
        message: 'Invalid credentials',
      },
      { status: 401 }
    );
  }),

  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };

    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        {
          success: false,
          message: 'Email already exists',
        },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          userId: 'new-user-id',
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          profileComplete: false,
        },
        token: 'new-user-token',
      },
    });
  }),

  http.post('/api/v1/auth/forgot-password', async ({ request }) => {
    const body = (await request.json()) as { email?: string };

    return HttpResponse.json({
      success: true,
      message: 'Password reset email sent',
    });
  }),

  http.post('/api/v1/auth/reset-password', async ({ request }) => {
    const body = (await request.json()) as { token?: string; password?: string };

    if (body.token === 'invalid-token') {
      return HttpResponse.json(
        {
          success: false,
          message: 'Invalid or expired reset token',
        },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Password reset successful',
    });
  }),

  http.get('/api/v1/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authToken) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: { user: mockUser },
    });
  }),

  http.post('/api/v1/auth/logout', () => {
    authToken = null;
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  }),

  // ===== Discovery Endpoints =====
  http.get('/api/v1/discovery/health', () => {
    return HttpResponse.json({
      success: true,
      service: 'discovery',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }),

  http.get('/api/v1/discovery/pets', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const type = url.searchParams.get('type');

    let filteredPets = mockPets;
    if (type) {
      filteredPets = mockPets.filter((pet) => pet.type === type);
    }

    return HttpResponse.json({
      success: true,
      message: 'Discovery queue retrieved successfully',
      data: {
        pets: filteredPets.slice(0, limit),
        sessionId: 'mock-session-123',
        hasMore: filteredPets.length > limit,
      },
      timestamp: new Date().toISOString(),
    });
  }),

  http.post('/api/v1/discovery/pets/more', async ({ request }) => {
    const body = (await request.json()) as {
      sessionId?: string;
      lastPetId?: string;
      limit?: number;
    };

    if (!body.sessionId || !body.lastPetId) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: [
            { msg: 'Session ID is required', path: 'sessionId' },
            { msg: 'Last pet ID is required', path: 'lastPetId' },
          ],
        },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'More pets loaded successfully',
      data: {
        pets: [
          {
            petId: 'pet3',
            name: 'Max',
            type: 'dog',
            breed: 'Labrador',
            ageGroup: 'puppy',
            size: 'large',
            gender: 'male',
            images: ['image3.jpg'],
            rescueName: 'Dog Rescue',
            rescueId: 'rescue3',
          },
        ],
      },
      timestamp: new Date().toISOString(),
    });
  }),

  http.post('/api/v1/discovery/swipe/action', async ({ request }) => {
    const body = (await request.json()) as {
      sessionId?: string;
      petId?: string;
      action?: string;
      timestamp?: string;
      userId?: string;
    };

    if (!body.sessionId || !body.petId || !body.action) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: [
            { msg: 'Session ID is required', path: 'sessionId' },
            { msg: 'Pet ID is required', path: 'petId' },
            { msg: 'Action is required', path: 'action' },
          ],
        },
        { status: 400 }
      );
    }

    // If action is 'like', add to favorites
    if (body.action === 'like' && body.petId && !favorites.includes(body.petId)) {
      favorites.push(body.petId);
    }

    return HttpResponse.json({
      success: true,
      message: 'Swipe action recorded successfully',
      timestamp: new Date().toISOString(),
    });
  }),

  // ===== Pet Endpoints =====
  http.get('/api/v1/pets/:petId', ({ params }) => {
    const { petId } = params;
    const pet = mockPets.find((p) => p.petId === petId);

    if (!pet) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Pet not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: { pet },
    });
  }),

  http.get('/api/v1/pets', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const type = url.searchParams.get('type');
    const size = url.searchParams.get('size');

    let filteredPets = mockPets;

    if (search) {
      filteredPets = filteredPets.filter((pet) =>
        pet.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (type) {
      filteredPets = filteredPets.filter((pet) => pet.type === type);
    }

    if (size) {
      filteredPets = filteredPets.filter((pet) => pet.size === size);
    }

    return HttpResponse.json({
      success: true,
      data: { pets: filteredPets },
    });
  }),

  // ===== Favorites Endpoints =====
  http.get('/api/v1/favorites', () => {
    const favoritePets = mockPets.filter((pet) => favorites.includes(pet.petId));

    return HttpResponse.json({
      success: true,
      data: { favorites: favoritePets },
    });
  }),

  http.post('/api/v1/favorites/:petId', ({ params }) => {
    const { petId } = params;

    if (!favorites.includes(petId as string)) {
      favorites.push(petId as string);
    }

    return HttpResponse.json({
      success: true,
      message: 'Pet added to favorites',
    });
  }),

  http.delete('/api/v1/favorites/:petId', ({ params }) => {
    const { petId } = params;
    favorites = favorites.filter((id) => id !== petId);

    return HttpResponse.json({
      success: true,
      message: 'Pet removed from favorites',
    });
  }),

  // ===== Application Endpoints =====
  http.post('/api/v1/applications', async ({ request }) => {
    const body = (await request.json()) as {
      petId?: string;
      data?: unknown;
    };

    const newApplication = {
      applicationId: `app-${Date.now()}`,
      petId: body.petId || '',
      userId: mockUser.userId,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      data: body.data,
    };

    applications.push(newApplication);

    return HttpResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: { application: newApplication },
    });
  }),

  http.get('/api/v1/applications', () => {
    return HttpResponse.json({
      success: true,
      data: { applications },
    });
  }),

  http.get('/api/v1/applications/:applicationId', ({ params }) => {
    const { applicationId } = params;
    const application = applications.find((app) => app.applicationId === applicationId);

    if (!application) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Application not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: { application },
    });
  }),

  http.patch('/api/v1/applications/:applicationId', async ({ params, request }) => {
    const { applicationId } = params;
    const body = (await request.json()) as { status?: string };

    const application = applications.find((app) => app.applicationId === applicationId);

    if (!application) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Application not found',
        },
        { status: 404 }
      );
    }

    if (body.status) {
      application.status = body.status;
    }

    return HttpResponse.json({
      success: true,
      message: 'Application updated successfully',
      data: { application },
    });
  }),

  // ===== Rescue Endpoints =====
  http.get('/api/v1/rescues/:rescueId', ({ params }) => {
    const { rescueId } = params;
    const rescue = mockRescues.find((r) => r.rescueId === rescueId);

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
      data: { rescue },
    });
  }),

  // ===== User Profile Endpoints =====
  http.get('/api/v1/users/:userId', () => {
    return HttpResponse.json({
      success: true,
      data: { user: mockUser },
    });
  }),

  http.patch('/api/v1/users/:userId', async ({ request }) => {
    const body = (await request.json()) as Partial<typeof mockUser>;

    Object.assign(mockUser, body);

    return HttpResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: mockUser },
    });
  }),

  // ===== Notifications Endpoints =====
  http.get('/api/v1/notifications', () => {
    return HttpResponse.json({
      success: true,
      data: {
        notifications: [
          {
            notificationId: 'notif1',
            type: 'application_update',
            message: 'Your application for Buddy has been reviewed',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
  }),

  http.patch('/api/v1/notifications/:notificationId', () => {
    return HttpResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  }),

  // ===== Test Endpoints =====
  http.get('/api/v1/discovery/test', () => {
    return HttpResponse.json({
      success: true,
      message: 'Discovery test endpoint',
      data: {
        pets: [
          {
            petId: 'test-pet-1',
            name: 'Test Pet',
            type: 'DOG',
            breed: 'Test Breed',
          },
        ],
      },
      timestamp: new Date().toISOString(),
    });
  }),

  http.get('/api/v1/discovery/db-test', () => {
    return HttpResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        petCount: '5',
        timestamp: new Date().toISOString(),
      },
    });
  }),
];

// Helper function to reset mock data between tests
export const resetMockData = () => {
  favorites = [];
  applications = [];
  authToken = null;
};
