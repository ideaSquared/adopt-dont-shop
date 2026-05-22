import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApplicationFilter } from '../types/applications';

const apiServiceMock = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<unknown>>(),
  patch: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
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

/**
 * ADS-642: stage transitions go through the bulk-update endpoint —
 * there is no dedicated stage-transition route on the backend. These
 * tests pin down that single-row transitions dispatch a one-item batch
 * with the correct updates payload for each StageAction type.
 */
describe('RescueApplicationService.transitionStage (ADS-642)', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
    apiServiceMock.patch.mockResolvedValue({ updatedCount: 1 });
  });

  const getBulkRequest = (): {
    url: string;
    body: { applicationIds: string[]; updates: Record<string, unknown> };
  } => {
    expect(apiServiceMock.patch).toHaveBeenCalledTimes(1);
    const [url, body] = apiServiceMock.patch.mock.calls[0];
    return { url, body: body as { applicationIds: string[]; updates: Record<string, unknown> } };
  };

  it('targets the bulk-update endpoint with a single-element applicationIds batch', async () => {
    await service.transitionStage('app-1', 'START_REVIEW', 'REVIEWING');

    const { url, body } = getBulkRequest();
    expect(url).toBe('/api/v1/applications/bulk-update');
    expect(body.applicationIds).toEqual(['app-1']);
  });

  it('writes the lowercased next stage for non-terminal transitions', async () => {
    await service.transitionStage('app-1', 'SCHEDULE_VISIT', 'VISITING');

    expect(getBulkRequest().body.updates).toEqual({ stage: 'visiting' });
  });

  it('resolves the application with rejected status when the action is REJECT', async () => {
    await service.transitionStage('app-1', 'REJECT', 'RESOLVED', 'incomplete references');

    expect(getBulkRequest().body.updates).toEqual({
      status: 'rejected',
      stage: 'resolved',
      finalOutcome: 'rejected',
      rejectionReason: 'incomplete references',
    });
  });

  it('marks the application as withdrawn when the action is WITHDRAW', async () => {
    await service.transitionStage('app-1', 'WITHDRAW', 'RESOLVED', 'applicant changed mind');

    expect(getBulkRequest().body.updates).toEqual({
      status: 'withdrawn',
      stage: 'withdrawn',
      finalOutcome: 'withdrawn',
      withdrawalReason: 'applicant changed mind',
    });
  });

  it('throws when a non-terminal action is missing its nextStage', async () => {
    await expect(service.transitionStage('app-1', 'START_REVIEW', undefined)).rejects.toThrow(
      /nextStage/
    );
    expect(apiServiceMock.patch).not.toHaveBeenCalled();
  });
});
