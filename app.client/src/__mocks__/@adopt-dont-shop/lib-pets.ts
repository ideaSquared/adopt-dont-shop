// Mock pets data for favorites
const mockPets = [
  {
    pet_id: 'pet-1',
    name: 'Buddy',
    type: 'dog',
    breed: 'Golden Retriever',
    age: 3,
    gender: 'male',
    size: 'large',
    status: 'available',
    images: ['https://example.com/buddy.jpg'],
    description: 'Friendly golden retriever',
    location: {
      city: 'Seattle',
      state: 'WA',
      coordinates: [-122.3321, 47.6062] // Seattle coordinates [longitude, latitude]
    },
    rescue_id: 'rescue-1',
  },
  {
    pet_id: 'pet-2',
    name: 'Whiskers',
    type: 'cat',
    breed: 'Domestic Shorthair',
    age: 12,
    gender: 'female',
    size: 'small',
    status: 'available',
    images: ['https://example.com/whiskers.jpg'],
    description: 'Sweet senior cat',
    location: {
      city: 'Seattle',
      state: 'WA',
      coordinates: [-122.3321, 47.6062]
    },
    rescue_id: 'rescue-2',
  },
];

export class PetsService {
  private favoritePets = mockPets;
  private favoritePetIds: Set<string> = new Set(mockPets.map(p => p.pet_id));

  getPets = jest.fn(() => Promise.resolve([]));
  getPet = jest.fn((petId: string) => {
    const pet = this.favoritePets.find(p => p.pet_id === petId);
    return Promise.resolve(pet || null);
  });
  searchPets = jest.fn(() => Promise.resolve([]));
  getFavorites = jest.fn(() => Promise.resolve(this.favoritePets));

  addToFavorites = jest.fn((petId: string) => {
    this.favoritePetIds.add(petId);
    return Promise.resolve();
  });

  removeFromFavorites = jest.fn((petId: string) => {
    this.favoritePetIds.delete(petId);
    // Update favoritePets array to match
    this.favoritePets = this.favoritePets.filter(p => p.pet_id !== petId);
    return Promise.resolve();
  });

  // Helper for tests to set favorites
  setFavorites = (pets: typeof mockPets) => {
    this.favoritePets = pets;
    this.favoritePetIds = new Set(pets.map(p => p.pet_id));
  };
}

export const petsService = new PetsService();
