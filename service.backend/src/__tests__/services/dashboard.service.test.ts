import { vi, beforeEach, describe, it, expect } from 'vitest';

vi.mock('../../models/Pet', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn(),
  },
}));

vi.mock('../../models/Application', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn(),
  },
  ApplicationStatus: {
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
  },
}));

import Pet from '../../models/Pet';
import Application from '../../models/Application';
import { DashboardService } from '../../services/dashboard.service';

const petFindAll = vi.mocked(Pet.findAll);
const appFindAll = vi.mocked(Application.findAll);

const makeDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

describe('DashboardService.getActivityForRescue', () => {
  beforeEach(() => {
    petFindAll.mockResolvedValue([]);
    appFindAll.mockResolvedValue([]);
  });

  it('returns empty array when the rescue has no pets or applications', async () => {
    const result = await DashboardService.getActivityForRescue('rescue-1', 10);
    expect(result).toEqual([]);
  });

  it('returns pet_added activity for each pet belonging to the rescue', async () => {
    petFindAll.mockResolvedValue([
      { petId: 'pet-1', name: 'Buddy', createdAt: makeDate(1) },
    ] as unknown as Awaited<ReturnType<typeof Pet.findAll>>);

    const result = await DashboardService.getActivityForRescue('rescue-1', 10);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('pet_added');
    expect(result[0].metadata).toMatchObject({ petId: 'pet-1', petName: 'Buddy' });
  });

  it('returns application_received activity for each application belonging to the rescue', async () => {
    appFindAll.mockResolvedValue([
      { applicationId: 'app-1', petId: 'pet-1', createdAt: makeDate(2) },
    ] as unknown as Awaited<ReturnType<typeof Application.findAll>>);

    const result = await DashboardService.getActivityForRescue('rescue-1', 10);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('application_received');
    expect(result[0].metadata).toMatchObject({ applicationId: 'app-1', petId: 'pet-1' });
  });

  it('queries Pet and Application using the given rescueId', async () => {
    await DashboardService.getActivityForRescue('rescue-abc', 10);

    expect(petFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rescueId: 'rescue-abc' } })
    );
    expect(appFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rescueId: 'rescue-abc' } })
    );
  });

  it('sorts activities newest-first across pet and application events', async () => {
    const olderDate = makeDate(3);
    const newerDate = makeDate(1);

    petFindAll.mockResolvedValue([
      { petId: 'pet-1', name: 'Buddy', createdAt: olderDate },
    ] as unknown as Awaited<ReturnType<typeof Pet.findAll>>);

    appFindAll.mockResolvedValue([
      { applicationId: 'app-1', petId: 'pet-1', createdAt: newerDate },
    ] as unknown as Awaited<ReturnType<typeof Application.findAll>>);

    const result = await DashboardService.getActivityForRescue('rescue-1', 10);

    expect(result[0].type).toBe('application_received');
    expect(result[1].type).toBe('pet_added');
  });

  it('respects the limit parameter', async () => {
    petFindAll.mockResolvedValue([
      { petId: 'pet-1', name: 'A', createdAt: makeDate(1) },
      { petId: 'pet-2', name: 'B', createdAt: makeDate(2) },
      { petId: 'pet-3', name: 'C', createdAt: makeDate(3) },
    ] as unknown as Awaited<ReturnType<typeof Pet.findAll>>);

    const result = await DashboardService.getActivityForRescue('rescue-1', 2);

    expect(result).toHaveLength(2);
  });

  it('isolates data between rescues — queries use only the caller rescueId', async () => {
    await DashboardService.getActivityForRescue('rescue-1', 10);
    const petCall = petFindAll.mock.calls[0][0] as { where: { rescueId: string } };
    const appCall = appFindAll.mock.calls[0][0] as { where: { rescueId: string } };

    expect(petCall.where.rescueId).toBe('rescue-1');
    expect(appCall.where.rescueId).toBe('rescue-1');

    vi.clearAllMocks();
    petFindAll.mockResolvedValue([]);
    appFindAll.mockResolvedValue([]);

    await DashboardService.getActivityForRescue('rescue-2', 10);
    const petCall2 = petFindAll.mock.calls[0][0] as { where: { rescueId: string } };
    const appCall2 = appFindAll.mock.calls[0][0] as { where: { rescueId: string } };

    expect(petCall2.where.rescueId).toBe('rescue-2');
    expect(appCall2.where.rescueId).toBe('rescue-2');
  });

  it('each activity item has required fields: id, type, title, description, timestamp, metadata', async () => {
    petFindAll.mockResolvedValue([
      { petId: 'pet-1', name: 'Luna', createdAt: makeDate(1) },
    ] as unknown as Awaited<ReturnType<typeof Pet.findAll>>);

    const [item] = await DashboardService.getActivityForRescue('rescue-1', 10);

    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('type');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('description');
    expect(item).toHaveProperty('timestamp');
    expect(item).toHaveProperty('metadata');
    expect(typeof item.timestamp).toBe('string');
    expect(new Date(item.timestamp).toISOString()).toBe(item.timestamp);
  });
});
