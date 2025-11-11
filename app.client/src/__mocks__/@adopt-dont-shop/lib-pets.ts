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

  getPets = jest.fn(() => Promise.resolve([]));
  getPet = jest.fn((petId: string) => {
    const pet = this.favoritePets.find(p => p.pet_id === petId);
    return Promise.resolve(pet || null);
  });
  searchPets = jest.fn(() => Promise.resolve([]));
  getFavorites = jest.fn(() => Promise.resolve(this.favoritePets));

  // Helper for tests to set favorites
  setFavorites = (pets: typeof mockPets) => {
    this.favoritePets = pets;
  };
}

export const petsService = new PetsService();
