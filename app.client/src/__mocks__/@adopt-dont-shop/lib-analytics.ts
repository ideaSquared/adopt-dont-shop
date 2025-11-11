export class AnalyticsService {
  constructor(_config?: any) {}
  track = jest.fn();
  page = jest.fn();
  identify = jest.fn();
}

export const analyticsService = new AnalyticsService();
