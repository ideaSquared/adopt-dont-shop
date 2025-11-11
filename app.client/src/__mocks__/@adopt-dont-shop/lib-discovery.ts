export class DiscoveryService {
  getDiscoveryQueue = jest.fn(() => Promise.resolve([]));
  swipe = jest.fn(() => Promise.resolve());
  like = jest.fn(() => Promise.resolve());
  pass = jest.fn(() => Promise.resolve());
  superLike = jest.fn(() => Promise.resolve());
}

export const discoveryService = new DiscoveryService();
