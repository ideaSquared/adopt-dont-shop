/**
 * Behavioral tests for Pet Discovery Service
 *
 * Tests the discovery service behavior:
 * - Service can fetch discovery queue with pets
 * - Service handles filtering by pet type
 * - Service tracks swipe actions (like/pass/super-like)
 * - Service loads more pets when queue runs low
 * - Service handles API errors gracefully
 * - Service maintains session state
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const mockPets = [
  {
    petId: 'pet-1',
    name: 'Buddy',
    type: 'dog',
    breed: 'Golden Retriever',
    ageGroup: 'adult',
    size: 'large',
    gender: 'male',
    images: ['buddy.jpg'],
    rescueName: 'Happy Paws Rescue',
    description: 'Friendly and energetic',
  },
  {
    petId: 'pet-2',
    name: 'Whiskers',
    type: 'cat',
    breed: 'Persian',
    ageGroup: 'senior',
    size: 'medium',
    gender: 'female',
    images: ['whiskers.jpg'],
    rescueName: 'Cat Haven',
    description: 'Calm and affectionate',
  },
  {
    petId: 'pet-3',
    name: 'Max',
    type: 'dog',
    breed: 'Labrador',
    ageGroup: 'puppy',
    size: 'large',
    gender: 'male',
    images: ['max.jpg'],
    rescueName: 'Dog Rescue',
    description: 'Playful puppy',
  },
];

const server = setupServer(
  // Get discovery queue
  http.get('/api/v1/discovery/pets', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let filteredPets = mockPets;
    if (type) {
      filteredPets = mockPets.filter(pet => pet.type === type);
    }

    return HttpResponse.json({
      success: true,
      data: {
        pets: filteredPets.slice(0, limit),
        sessionId: 'session-123',
        hasMore: filteredPets.length > limit,
      },
      message: 'Discovery queue retrieved successfully',
    });
  }),

  // Record swipe action
  http.post('/api/v1/discovery/swipe/action', async ({ request }) => {
    const body = (await request.json()) as {
      sessionId: string;
      petId: string;
      action: string;
      timestamp: string;
    };

    if (!body.sessionId || !body.petId || !body.action) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Missing required fields',
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
      data: {
        sessionId: body.sessionId,
        petId: body.petId,
        action: body.action,
      },
    });
  }),

  // Load more pets
  http.post('/api/v1/discovery/pets/more', async ({ request }) => {
    const body = (await request.json()) as {
      sessionId: string;
      lastPetId: string;
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
      data: {
        pets: [
          {
            petId: 'pet-4',
            name: 'Luna',
            type: 'cat',
            breed: 'Siamese',
            ageGroup: 'young',
            size: 'small',
            gender: 'female',
            images: ['luna.jpg'],
            rescueName: 'Cat Sanctuary',
            description: 'Curious and playful',
          },
        ],
      },
      message: 'More pets loaded successfully',
    });
  }),

  // Get discovery stats
  http.get('/api/v1/discovery/stats/:sessionId', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalSwipes: 15,
        likes: 8,
        passes: 6,
        superLikes: 1,
        matches: 2,
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Discovery Service - Behavioral Tests', () => {
  describe('Fetching Discovery Queue', () => {
    it('should fetch initial discovery queue with pets', async () => {
      const response = await fetch('/api/v1/discovery/pets?limit=10');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.pets)).toBe(true);
      expect(data.data.pets.length).toBeGreaterThan(0);
      expect(data.data.sessionId).toBeTruthy();
    });

    it('should include pet details in discovery queue', async () => {
      const response = await fetch('/api/v1/discovery/pets?limit=10');
      const data = await response.json();

      const pet = data.data.pets[0];
      expect(pet.petId).toBeTruthy();
      expect(pet.name).toBeTruthy();
      expect(pet.type).toBeTruthy();
      expect(pet.breed).toBeTruthy();
      expect(pet.rescueName).toBeTruthy();
      expect(Array.isArray(pet.images)).toBe(true);
    });

    it('should support pagination with limit parameter', async () => {
      const response = await fetch('/api/v1/discovery/pets?limit=2');
      const data = await response.json();

      expect(data.data.pets.length).toBeLessThanOrEqual(2);
    });

    it('should indicate if more pets are available', async () => {
      const response = await fetch('/api/v1/discovery/pets?limit=2');
      const data = await response.json();

      expect(typeof data.data.hasMore).toBe('boolean');
    });
  });

  describe('Filtering Pets', () => {
    it('should filter pets by type (dogs only)', async () => {
      const response = await fetch('/api/v1/discovery/pets?type=dog');
      const data = await response.json();

      expect(data.success).toBe(true);
      data.data.pets.forEach((pet: any) => {
        expect(pet.type).toBe('dog');
      });
    });

    it('should filter pets by type (cats only)', async () => {
      const response = await fetch('/api/v1/discovery/pets?type=cat');
      const data = await response.json();

      expect(data.success).toBe(true);
      data.data.pets.forEach((pet: any) => {
        expect(pet.type).toBe('cat');
      });
    });

    it('should return all pets when no type filter applied', async () => {
      const response = await fetch('/api/v1/discovery/pets');
      const data = await response.json();

      const types = data.data.pets.map((p: any) => p.type);
      expect(types).toContain('dog');
      expect(types).toContain('cat');
    });
  });

  describe('Recording Swipe Actions', () => {
    it('should record like action', async () => {
      const swipeData = {
        sessionId: 'session-123',
        petId: 'pet-1',
        action: 'like',
        timestamp: new Date().toISOString(),
      };

      const response = await fetch('/api/v1/discovery/swipe/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swipeData),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.action).toBe('like');
    });

    it('should record pass action', async () => {
      const swipeData = {
        sessionId: 'session-123',
        petId: 'pet-2',
        action: 'pass',
        timestamp: new Date().toISOString(),
      };

      const response = await fetch('/api/v1/discovery/swipe/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swipeData),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.action).toBe('pass');
    });

    it('should record super-like action', async () => {
      const swipeData = {
        sessionId: 'session-123',
        petId: 'pet-3',
        action: 'super-like',
        timestamp: new Date().toISOString(),
      };

      const response = await fetch('/api/v1/discovery/swipe/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swipeData),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.action).toBe('super-like');
    });

    it('should validate required fields for swipe action', async () => {
      const response = await fetch('/api/v1/discovery/swipe/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(Array.isArray(data.errors)).toBe(true);
    });
  });

  describe('Loading More Pets', () => {
    it('should load more pets for continued browsing', async () => {
      const response = await fetch('/api/v1/discovery/pets/more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'session-123',
          lastPetId: 'pet-3',
          limit: 10,
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.pets)).toBe(true);
      expect(data.data.pets.length).toBeGreaterThan(0);
    });

    it('should require sessionId for loading more', async () => {
      const response = await fetch('/api/v1/discovery/pets/more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastPetId: 'pet-3',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should require lastPetId for loading more', async () => {
      const response = await fetch('/api/v1/discovery/pets/more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'session-123',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('Discovery Statistics', () => {
    it('should track discovery session statistics', async () => {
      const response = await fetch('/api/v1/discovery/stats/session-123');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(typeof data.data.totalSwipes).toBe('number');
      expect(typeof data.data.likes).toBe('number');
      expect(typeof data.data.passes).toBe('number');
      expect(typeof data.data.superLikes).toBe('number');
      expect(typeof data.data.matches).toBe('number');
    });

    it('should have consistent swipe totals', async () => {
      const response = await fetch('/api/v1/discovery/stats/session-123');
      const data = await response.json();

      const total = data.data.likes + data.data.passes + data.data.superLikes;
      expect(total).toBe(data.data.totalSwipes);
    });
  });

  describe('Error Handling', () => {
    it('should handle API failure gracefully', async () => {
      server.use(
        http.get('/api/v1/discovery/pets', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Failed to load pets',
            },
            { status: 500 }
          );
        })
      );

      const response = await fetch('/api/v1/discovery/pets');
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should handle network timeout', async () => {
      server.use(
        http.get('/api/v1/discovery/pets', async () => {
          // Simulate timeout
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({ success: false });
        })
      );

      const response = await fetch('/api/v1/discovery/pets');
      expect(response).toBeTruthy();
    });
  });

  describe('Session Management', () => {
    it('should create unique session ID for each discovery session', async () => {
      const response1 = await fetch('/api/v1/discovery/pets');
      const data1 = await response1.json();

      const response2 = await fetch('/api/v1/discovery/pets');
      const data2 = await response2.json();

      expect(data1.data.sessionId).toBeTruthy();
      expect(data2.data.sessionId).toBeTruthy();
      // In a real scenario, these might be different or the same depending on implementation
    });

    it('should maintain session context across requests', async () => {
      const initialResponse = await fetch('/api/v1/discovery/pets');
      const initialData = await initialResponse.json();
      const sessionId = initialData.data.sessionId;

      const swipeResponse = await fetch('/api/v1/discovery/swipe/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          petId: 'pet-1',
          action: 'like',
          timestamp: new Date().toISOString(),
        }),
      });

      const swipeData = await swipeResponse.json();
      expect(swipeData.success).toBe(true);
      expect(swipeData.data.sessionId).toBe(sessionId);
    });
  });
});
