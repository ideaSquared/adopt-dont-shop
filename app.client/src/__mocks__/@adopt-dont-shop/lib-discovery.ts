/**
 * Mock for @adopt-dont-shop/lib-discovery
 */

// Sample discovery pets for testing
const mockDiscoveryPets = [
  {
    petId: 'pet-1',
    name: 'Buddy',
    type: 'dog' as const,
    breed: 'Golden Retriever',
    ageGroup: 'adult' as const,
    ageYears: 3,
    ageMonths: 6,
    size: 'large' as const,
    gender: 'male' as const,
    images: ['https://example.com/buddy.jpg'],
    shortDescription: 'Friendly and energetic golden retriever',
    distance: 5.2,
    rescueName: 'Happy Paws Rescue',
    isSponsored: false,
    compatibilityScore: 95,
  },
  {
    petId: 'pet-2',
    name: 'Luna',
    type: 'cat' as const,
    breed: 'Siamese',
    ageGroup: 'young' as const,
    ageYears: 1,
    ageMonths: 8,
    size: 'small' as const,
    gender: 'female' as const,
    images: ['https://example.com/luna.jpg'],
    shortDescription: 'Playful and affectionate cat',
    distance: 2.8,
    rescueName: 'Feline Friends',
    isSponsored: false,
    compatibilityScore: 88,
  },
  {
    petId: 'pet-3',
    name: 'Max',
    type: 'dog' as const,
    breed: 'Labrador Retriever',
    ageGroup: 'adult' as const,
    ageYears: 5,
    size: 'large' as const,
    gender: 'male' as const,
    images: ['https://example.com/max.jpg'],
    shortDescription: 'Loyal and gentle family dog',
    distance: 7.5,
    rescueName: 'Second Chance Shelter',
    isSponsored: true,
    compatibilityScore: 92,
  },
];

export class DiscoveryService {
  private mockPets = [...mockDiscoveryPets];
  private swipeHistory: Array<{ petId: string; action: string }> = [];

  getDiscoveryQueue = jest.fn(() => Promise.resolve({
    pets: this.mockPets,
    sessionId: 'test-session-123',
    hasMore: true,
    nextCursor: 'cursor-123',
  }));

  swipe = jest.fn((action: { action: string; petId: string }) => {
    this.swipeHistory.push({ petId: action.petId, action: action.action });
    return Promise.resolve();
  });

  like = jest.fn((petId: string) => {
    this.swipeHistory.push({ petId, action: 'like' });
    return Promise.resolve();
  });

  pass = jest.fn((petId: string) => {
    this.swipeHistory.push({ petId, action: 'pass' });
    return Promise.resolve();
  });

  superLike = jest.fn((petId: string) => {
    this.swipeHistory.push({ petId, action: 'super_like' });
    return Promise.resolve();
  });

  // Helper methods for testing
  getSwipeHistory = () => this.swipeHistory;
  resetSwipeHistory = () => { this.swipeHistory = []; };
  setMockPets = (pets: typeof mockDiscoveryPets) => { this.mockPets = pets; };
}

export const discoveryService = new DiscoveryService();
