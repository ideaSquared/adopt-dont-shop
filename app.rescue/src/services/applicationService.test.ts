import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApplicationFilter } from '../types/applications';

const apiServiceMock = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<unknown>>(),
}));

vi.mock('./libraryServices', () => ({
  apiService: apiServiceMock,
}));

import { RescueApplicationService } from './applicationService';

/**
 * ADS-575: behaviour tests that pin down which filter fields the
 * rescue application service forwards to the backend `/applications`
 * endpoint. Each filter that the UI exposes must surface as a query
 * parameter or the dropdowns silently lie to staff.
 */
describe('RescueApplicationService.getApplications query parameters (ADS-575)', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
    apiServiceMock.get.mockResolvedValue({ applications: [], total: 0 });
  });

  const getRequestedUrl = (): string => {
    expect(apiServiceMock.get).toHaveBeenCalledTimes(1);
    const [url] = apiServiceMock.get.mock.calls[0];
    return url;
  };

  const getRequestedParams = (): URLSearchParams => {
    const url = getRequestedUrl();
    const queryStart = url.indexOf('?');
    return new URLSearchParams(url.slice(queryStart + 1));
  };

  it('forwards a pet-type filter as a petType query parameter', async () => {
    const filter: ApplicationFilter = { petType: 'Dog' };

    await service.getApplications(filter);

    expect(getRequestedParams().get('petType')).toBe('Dog');
  });

  it('forwards a pet-breed filter as a petBreed query parameter', async () => {
    const filter: ApplicationFilter = { petBreed: 'golden retriever' };

    await service.getApplications(filter);

    expect(getRequestedParams().get('petBreed')).toBe('golden retriever');
  });

  it('forwards a date range as submittedFrom / submittedTo ISO timestamps', async () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-08T00:00:00.000Z');
    const filter: ApplicationFilter = { dateRange: { start, end } };

    await service.getApplications(filter);

    const params = getRequestedParams();
    expect(params.get('submittedFrom')).toBe(start.toISOString());
    expect(params.get('submittedTo')).toBe(end.toISOString());
    // The legacy startDate / endDate names were never read server-side.
    expect(params.get('startDate')).toBeNull();
    expect(params.get('endDate')).toBeNull();
  });

  it('still forwards the search and status filters that already worked', async () => {
    const filter: ApplicationFilter = {
      searchQuery: 'jane',
      status: ['submitted'],
    };

    await service.getApplications(filter);

    const params = getRequestedParams();
    expect(params.get('search')).toBe('jane');
    expect(params.get('status')).toBe('submitted');
  });

  it('omits filter parameters when the filter value is empty', async () => {
    await service.getApplications({});

    const params = getRequestedParams();
    expect(params.get('petType')).toBeNull();
    expect(params.get('petBreed')).toBeNull();
    expect(params.get('submittedFrom')).toBeNull();
    expect(params.get('submittedTo')).toBeNull();
  });
});
