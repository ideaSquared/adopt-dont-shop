/**
 * Mock for @adopt-dont-shop/lib-rescue
 */

export class RescueService {
  getRescue = jest.fn(() => Promise.resolve(null));
  getRescues = jest.fn(() => Promise.resolve({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }));
  createRescue = jest.fn(() => Promise.resolve({}));
  updateRescue = jest.fn(() => Promise.resolve({}));
  deleteRescue = jest.fn(() => Promise.resolve());
}

export const rescueService = new RescueService();
