/**
 * Mock for @adopt-dont-shop/lib-search
 */

export class SearchService {
  search = jest.fn(() => Promise.resolve({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }));
  searchPets = jest.fn(() => Promise.resolve({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }));
  searchRescues = jest.fn(() => Promise.resolve({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }));
}

export const searchService = new SearchService();
