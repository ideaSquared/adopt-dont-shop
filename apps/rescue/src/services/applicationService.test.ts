import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApplicationFilter } from '../types/applications';

const apiServiceMock = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<unknown>>(),
  post: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  patch: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  put: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
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

  it('writes the lowercased next stage for a START_REVIEW transition', async () => {
    await service.transitionStage('app-1', 'START_REVIEW', 'REVIEWING');

    expect(getBulkRequest().body.updates).toEqual({ stage: 'reviewing' });
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

/**
 * ADS-1189: non-terminal stage moves used to send a bare `{ stage }`, which
 * the bulk-update route rejects while still returning HTTP 200 — so the modal
 * reported phantom success. The transition now (1) carries the fields the
 * route needs (scheduledAt for a visit, outcome for completion, status for a
 * decision) and (2) throws when the response reports any failed row.
 */
describe('RescueApplicationService.transitionStage payloads + failure surfacing (ADS-1189)', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
    apiServiceMock.patch.mockResolvedValue({
      data: { successCount: 1, failureCount: 0, failures: [] },
    });
  });

  const getBulkUpdates = (): Record<string, unknown> => {
    expect(apiServiceMock.patch).toHaveBeenCalledTimes(1);
    const [, body] = apiServiceMock.patch.mock.calls[0];
    return (body as { updates: Record<string, unknown> }).updates;
  };

  it('carries scheduledAt when scheduling a visit (SCHEDULE_VISIT)', async () => {
    await service.transitionStage('app-1', 'SCHEDULE_VISIT', 'VISITING', undefined, {
      scheduledAt: '2026-05-01T14:00:00.000Z',
    });

    expect(getBulkUpdates()).toEqual({
      stage: 'visiting',
      scheduledAt: '2026-05-01T14:00:00.000Z',
    });
  });

  it('throws before any request when SCHEDULE_VISIT has no scheduledAt', async () => {
    await expect(service.transitionStage('app-1', 'SCHEDULE_VISIT', 'VISITING')).rejects.toThrow(
      /scheduledAt/
    );
    expect(apiServiceMock.patch).not.toHaveBeenCalled();
  });

  it('carries the outcome when completing a visit (COMPLETE_VISIT)', async () => {
    await service.transitionStage('app-1', 'COMPLETE_VISIT', 'DECIDING', 'went well', {
      outcome: 'passed',
    });

    expect(getBulkUpdates()).toEqual({
      stage: 'deciding',
      outcome: 'passed',
      notes: 'went well',
    });
  });

  it('throws before any request when COMPLETE_VISIT has no outcome', async () => {
    await expect(service.transitionStage('app-1', 'COMPLETE_VISIT', 'DECIDING')).rejects.toThrow(
      /outcome/
    );
    expect(apiServiceMock.patch).not.toHaveBeenCalled();
  });

  it('routes an approval decision through the status path (MAKE_DECISION)', async () => {
    await service.transitionStage('app-1', 'MAKE_DECISION', 'RESOLVED', 'great home', {
      status: 'approved',
    });

    expect(getBulkUpdates()).toEqual({
      status: 'approved',
      stage: 'resolved',
      finalOutcome: 'approved',
      notes: 'great home',
    });
  });

  it('routes a rejection decision through the status path (MAKE_DECISION)', async () => {
    await service.transitionStage('app-1', 'MAKE_DECISION', 'RESOLVED', 'unsuitable', {
      status: 'rejected',
    });

    expect(getBulkUpdates()).toEqual({
      status: 'rejected',
      stage: 'resolved',
      finalOutcome: 'rejected',
      rejectionReason: 'unsuitable',
    });
  });

  it('throws before any request when MAKE_DECISION has no decision', async () => {
    await expect(service.transitionStage('app-1', 'MAKE_DECISION', 'RESOLVED')).rejects.toThrow(
      /approved.*rejected|decision/
    );
    expect(apiServiceMock.patch).not.toHaveBeenCalled();
  });

  it('throws with the failure reason when the bulk response reports a failed row', async () => {
    apiServiceMock.patch.mockResolvedValueOnce({
      data: {
        successCount: 0,
        failureCount: 1,
        failures: [{ applicationId: 'app-1', error: 'FAILED_PRECONDITION: not in review' }],
      },
    });

    await expect(service.transitionStage('app-1', 'START_REVIEW', 'REVIEWING')).rejects.toThrow(
      /FAILED_PRECONDITION/
    );
  });

  it('resolves when the bulk response reports no failures', async () => {
    await expect(
      service.transitionStage('app-1', 'START_REVIEW', 'REVIEWING')
    ).resolves.toBeDefined();
  });
});

/**
 * ADS-1190: the gateway nests paging metadata under `pagination`
 * ({ success, data, pagination }). The transformer used to read page/total
 * off the top level, leaving the list stuck on page 1.
 */
describe('RescueApplicationService.getApplications pagination (ADS-1190)', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads page/total/totalPages from the nested pagination envelope', async () => {
    apiServiceMock.get.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 2, limit: 25, total: 60, totalPages: 3, hasNext: true, hasPrev: true },
    });

    const result = await service.getApplications(undefined, undefined, 2, 25);

    expect(result.page).toBe(2);
    expect(result.total).toBe(60);
    expect(result.totalPages).toBe(3);
  });

  it('advances to the reported page rather than staying on page 1', async () => {
    apiServiceMock.get.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 3, limit: 10, total: 25, totalPages: 3, hasNext: false, hasPrev: true },
    });

    const result = await service.getApplications(undefined, undefined, 3, 10);

    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
  });
});

/**
 * ADS-1199: references live inside the submitted answers blob
 * (application.data.references), shaped { veterinarian?, personal?[] } — the
 * applications view never returns a flat top-level `references` array, so the
 * old `application.references` read always yielded an empty list.
 */
describe('RescueApplicationService.getReferenceChecks (ADS-1199)', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads veterinarian and personal references from application.data.references', async () => {
    apiServiceMock.get.mockResolvedValueOnce({
      data: {
        id: 'app-1',
        data: {
          references: {
            veterinarian: {
              name: 'Dr Vet',
              clinicName: 'Paws Clinic',
              phone: '01234',
              status: 'pending',
            },
            personal: [
              { name: 'Jane Doe', relationship: 'Friend', phone: '5678', status: 'contacted' },
            ],
          },
        },
      },
    });

    const refs = await service.getReferenceChecks('app-1');

    expect(refs).toEqual([
      {
        id: 'ref-0',
        applicationId: 'app-1',
        type: 'veterinarian',
        contactName: 'Dr Vet',
        contactInfo: '01234 - Paws Clinic',
        status: 'pending',
        notes: '',
        completedAt: undefined,
        completedBy: undefined,
      },
      {
        id: 'ref-1',
        applicationId: 'app-1',
        type: 'personal',
        contactName: 'Jane Doe',
        contactInfo: '5678 - Friend',
        status: 'contacted',
        notes: '',
        completedAt: undefined,
        completedBy: undefined,
      },
    ]);
  });

  it('returns an empty list when the answers blob has no references', async () => {
    apiServiceMock.get.mockResolvedValueOnce({ data: { id: 'app-1', data: {} } });

    await expect(service.getReferenceChecks('app-1')).resolves.toEqual([]);
  });
});

/**
 * ADS-1204: getApplicationStats targeted /statistics (404) and returned the
 * raw response. It now hits /stats and unwraps the `{ data }` envelope.
 */
describe('RescueApplicationService.getApplicationStats (ADS-1204)', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests /stats and returns the unwrapped data envelope', async () => {
    const stats = {
      total: 42,
      byStatus: { submitted: 10, approved: 20, rejected: 12 },
      avgProcessingTime: 3,
      recentSubmissions: 5,
      pendingReferences: 4,
      scheduledVisits: 2,
    };
    apiServiceMock.get.mockResolvedValueOnce({ data: stats });

    const result = await service.getApplicationStats();

    expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/applications/stats');
    expect(result).toEqual(stats);
  });
});

/**
 * scheduleHomeVisit posts to the service-shaped ScheduleHomeVisit route
 * (POST /api/v1/applications/:id/home-visit/schedule), which takes a single
 * `scheduledAt` instant + optional `note`. These tests pin the path and the
 * date/time → ISO folding so the schedule form keeps landing on a real route.
 */
describe('RescueApplicationService.scheduleHomeVisit', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
    apiServiceMock.post.mockResolvedValue({ application: { applicationId: 'app-1' } });
  });

  it('posts to the singular home-visit/schedule route with a combined ISO scheduledAt', async () => {
    await service.scheduleHomeVisit('app-1', {
      scheduledDate: '2026-05-01',
      scheduledTime: '14:00',
      assignedStaff: 'Jamie',
      notes: 'gate code 1234',
    });

    expect(apiServiceMock.post).toHaveBeenCalledTimes(1);
    const [url, body] = apiServiceMock.post.mock.calls[0];
    expect(url).toBe('/api/v1/applications/app-1/home-visit/schedule');
    expect(body).toEqual({
      scheduledAt: new Date('2026-05-01T14:00').toISOString(),
      note: 'gate code 1234',
    });
  });

  it('returns the scheduled visit assembled from the submitted values', async () => {
    const visit = await service.scheduleHomeVisit('app-1', {
      scheduledDate: '2026-05-01',
      scheduledTime: '14:00',
      assignedStaff: 'Jamie',
    });

    expect(visit).toMatchObject({
      applicationId: 'app-1',
      scheduledDate: '2026-05-01',
      scheduledTime: '14:00',
      assignedStaff: 'Jamie',
      status: 'scheduled',
    });
  });
});

/**
 * ADS-1175: cancelling a home visit collects a reason, but the service
 * dropped it — only cancelledAt / rescheduleReason were mapped to the API
 * body. The reason must be forwarded as `cancelled_reason` so the backend
 * can persist it.
 */
describe('RescueApplicationService.updateHomeVisit cancellation reason (ADS-1175)', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
    apiServiceMock.put.mockResolvedValue({ success: true, visit: { id: 'visit-1' } });
  });

  it('maps cancelReason to the cancelled_reason API field', async () => {
    await service.updateHomeVisit('app-1', 'visit-1', {
      status: 'cancelled',
      cancelReason: 'adopter withdrew',
      cancelledAt: '2026-06-10T10:00:00.000Z',
    });

    expect(apiServiceMock.put).toHaveBeenCalledTimes(1);
    const [url, body] = apiServiceMock.put.mock.calls[0];
    expect(url).toBe('/api/v1/applications/app-1/home-visits/visit-1');
    expect(body).toMatchObject({
      status: 'cancelled',
      cancelled_reason: 'adopter withdrew',
      cancelled_at: '2026-06-10T10:00:00.000Z',
    });
  });
});

/**
 * UX P0/P1 #6: getApplicationTimeline used to swallow every fetch error
 * and return `[]`. That made it impossible for the timeline modal to tell
 * "no events yet" apart from "the API blew up". It now propagates the
 * error so callers can render a proper error state.
 */
describe('RescueApplicationService.getApplicationTimeline error propagation (UX P0/P1 #6)', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with the underlying error when the timeline request fails', async () => {
    apiServiceMock.get.mockRejectedValueOnce(new Error('network down'));

    await expect(service.getApplicationTimeline('app-1')).rejects.toThrow(/network down/);
  });

  it('still resolves with an empty array when the backend returns no events', async () => {
    apiServiceMock.get.mockResolvedValueOnce({ timeline: [] });

    await expect(service.getApplicationTimeline('app-1')).resolves.toEqual([]);
  });
});

/**
 * UX P2 G: getHomeVisits used to fall back to the application data when
 * the dedicated home-visits endpoint failed; if THAT fallback also failed
 * it returned `[]` — indistinguishable from "no visits scheduled" — which
 * masked outages from rescue staff. The double-failure path now propagates
 * the error so the consuming hook can surface an inline error indicator.
 */
describe('RescueApplicationService.getHomeVisits error propagation (UX P2 G)', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when both the dedicated endpoint and the application fallback fail', async () => {
    apiServiceMock.get
      .mockRejectedValueOnce(new Error('home-visits endpoint down'))
      .mockRejectedValueOnce(new Error('application endpoint down'));

    await expect(service.getHomeVisits('app-1')).rejects.toThrow(/application endpoint down/);
  });

  it('still resolves with an empty array when the dedicated endpoint succeeds with no visits', async () => {
    apiServiceMock.get.mockResolvedValueOnce({ success: true, visits: [] });

    await expect(service.getHomeVisits('app-1')).resolves.toEqual([]);
  });
});
