export class PetsService {
  getPets = jest.fn(() => Promise.resolve([]));
  getPet = jest.fn(() => Promise.resolve(null));
  searchPets = jest.fn(() => Promise.resolve([]));
}

export const petsService = new PetsService();
