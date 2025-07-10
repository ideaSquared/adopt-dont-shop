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
  },
];

export const mswHandlers = [
  // Health check endpoint
  http.get('/api/v1/discovery/health', () => {
    return HttpResponse.json({
      success: true,
      service: 'discovery',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }),

  // Discovery queue endpoint
  http.get('/api/v1/discovery/pets', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const type = url.searchParams.get('type');

    let filteredPets = mockPets;
    if (type) {
      filteredPets = mockPets.filter(pet => pet.type === type);
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

  // Load more pets endpoint
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
          },
        ],
      },
      timestamp: new Date().toISOString(),
    });
  }),

  // Swipe action endpoint
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

    return HttpResponse.json({
      success: true,
      message: 'Swipe action recorded successfully',
      timestamp: new Date().toISOString(),
    });
  }),

  // Test endpoint
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

  // Database test endpoint
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
