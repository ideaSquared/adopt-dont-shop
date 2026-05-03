import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock models before imports
vi.mock('../../models/Application', () => ({
  __esModule: true,
  default: {
    count: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../../models/AuditLog', () => ({
  __esModule: true,
  default: {
    count: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../../models/Chat', () => ({
  __esModule: true,
  default: {
    count: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../../models/Message', () => ({
  __esModule: true,
  default: {
    count: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../../models/Pet', () => ({
  __esModule: true,
  default: {
    count: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../../models/PetMedia', () => ({
  __esModule: true,
  default: {
    count: vi.fn(),
    findAll: vi.fn(),
  },
  PetMediaType: {
    IMAGE: 'image',
  },
}));

vi.mock('../../models/Rescue', () => ({
  __esModule: true,
  default: {
    count: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../../models/User', () => ({
  __esModule: true,
  default: {
    count: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../../sequelize', () => ({
  __esModule: true,
  default: {
    query: vi.fn(),
    fn: vi.fn((name: string, col: unknown) => ({ fn: name, col })),
    col: vi.fn((name: string) => name),
    literal: vi.fn((val: string) => val),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));

import { Op } from 'sequelize';
import Application from '../../models/Application';
import AuditLog from '../../models/AuditLog';
import Chat from '../../models/Chat';
import Message from '../../models/Message';
import Pet from '../../models/Pet';
import User from '../../models/User';
import sequelize from '../../sequelize';
import { AnalyticsService } from '../../services/analytics.service';

const mockApplication = Application as unknown as {
  count: ReturnType<typeof vi.fn>;
  findAll: ReturnType<typeof vi.fn>;
};
const mockAuditLog = AuditLog as unknown as {
  count: ReturnType<typeof vi.fn>;
};
const mockChat = Chat as unknown as {
  count: ReturnType<typeof vi.fn>;
};
const mockMessage = Message as unknown as {
  count: ReturnType<typeof vi.fn>;
  findAll: ReturnType<typeof vi.fn>;
};
const mockPet = Pet as unknown as {
  count: ReturnType<typeof vi.fn>;
};
const mockUser = User as unknown as {
  count: ReturnType<typeof vi.fn>;
};
const mockSequelize = sequelize as unknown as {
  query: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getAdoptionMetrics
// ---------------------------------------------------------------------------
describe('AnalyticsService.getAdoptionMetrics', () => {
  it('returns adoptionRate: 0 when there are no applications (guards against division by zero)', async () => {
    mockApplication.count.mockResolvedValue(0);
    mockApplication.findAll.mockResolvedValue([]);
    mockSequelize.query.mockResolvedValue([]);

    const result = await AnalyticsService.getAdoptionMetrics({});

    expect(result.adoptionRate).toBe(0);
    expect(isNaN(result.adoptionRate)).toBe(false);
    expect(isFinite(result.adoptionRate)).toBe(true);
  });

  it('returns correct adoptionRate when approved applications exist', async () => {
    // totalAdoptions (approved) = 3, totalApplications = 10
    mockApplication.count
      .mockResolvedValueOnce(3) // totalAdoptions
      .mockResolvedValueOnce(10); // totalApplications
    mockApplication.findAll.mockResolvedValue([]);
    mockSequelize.query.mockResolvedValue([]);

    const result = await AnalyticsService.getAdoptionMetrics({});

    expect(result.adoptionRate).toBe(30);
    expect(result.totalAdoptions).toBe(3);
  });

  it('defaults to last 30 days when no date range provided', async () => {
    mockApplication.count.mockResolvedValue(0);
    mockApplication.findAll.mockResolvedValue([]);
    mockSequelize.query.mockResolvedValue([]);

    const before = Date.now();
    await AnalyticsService.getAdoptionMetrics({});
    const after = Date.now();

    expect(mockApplication.count).toHaveBeenCalled();

    // Verify the query was constructed with a date approximately 30 days ago.
    // The date filter uses Sequelize Op symbols as keys, so we access them directly.
    const callArgs = mockApplication.count.mock.calls[0][0] as {
      where: { created_at: Record<symbol, Date> };
    };
    const createdAtFilter = callArgs.where.created_at;
    const startDate = createdAtFilter[Op.gte];
    const endDate = createdAtFilter[Op.lte];

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(endDate.getTime()).toBeGreaterThanOrEqual(before);
    expect(endDate.getTime()).toBeLessThanOrEqual(after + 100);
    expect(startDate.getTime()).toBeGreaterThanOrEqual(before - thirtyDaysMs - 1000);
    expect(startDate.getTime()).toBeLessThanOrEqual(after - thirtyDaysMs + 1000);
  });

  it('respects explicit startDate and endDate (boundary-inclusive)', async () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const endDate = new Date('2025-01-31T23:59:59Z');

    mockApplication.count.mockResolvedValue(0);
    mockApplication.findAll.mockResolvedValue([]);
    mockSequelize.query.mockResolvedValue([]);

    await AnalyticsService.getAdoptionMetrics({ startDate, endDate });

    // The date filter uses Sequelize Op symbols as keys, so we access them directly.
    const callArgs = mockApplication.count.mock.calls[0][0] as {
      where: { created_at: Record<symbol, Date> };
    };
    const createdAtFilter = callArgs.where.created_at;
    expect(createdAtFilter[Op.gte].getTime()).toBe(startDate.getTime());
    expect(createdAtFilter[Op.lte].getTime()).toBe(endDate.getTime());
  });

  it('returns avgTimeToAdoption: 0 when no adopted applications resolved', async () => {
    mockApplication.count.mockResolvedValue(0);
    mockApplication.findAll.mockResolvedValue([]); // no adopted apps
    mockSequelize.query.mockResolvedValue([]);

    const result = await AnalyticsService.getAdoptionMetrics({});

    expect(result.avgTimeToAdoption).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getUserBehaviorMetrics
// ---------------------------------------------------------------------------
describe('AnalyticsService.getUserBehaviorMetrics', () => {
  it('returns retentionRate: 0 when there are no users', async () => {
    mockUser.count.mockResolvedValue(0);
    mockSequelize.query.mockResolvedValue([]);

    const result = await AnalyticsService.getUserBehaviorMetrics({});

    expect(result.retentionRate).toBe(0);
    expect(isNaN(result.retentionRate)).toBe(false);
  });

  it('uses the maximum of messages/applications/logins as the active users count', async () => {
    // totalUsers call, newUsers call, messages call, applications call, logins call, previousPeriod call
    mockUser.count
      .mockResolvedValueOnce(100) // totalUsers
      .mockResolvedValueOnce(10) // newUsers
      .mockResolvedValueOnce(5) // activeUsersFromMessages
      .mockResolvedValueOnce(20) // activeUsersFromApplications (highest)
      .mockResolvedValueOnce(8) // activeUsersFromLogins
      .mockResolvedValueOnce(9); // previousPeriodUsers
    mockSequelize.query.mockResolvedValue([]);

    const result = await AnalyticsService.getUserBehaviorMetrics({});

    // retentionRate = (max(5, 20, 8) / 100) * 100 = 20
    expect(result.activeUsers).toBe(20);
    expect(result.retentionRate).toBe(20);
  });

  it('handles empty audit log without throwing', async () => {
    mockUser.count.mockResolvedValue(0);
    mockSequelize.query.mockResolvedValue([]); // empty session data and activities

    await expect(AnalyticsService.getUserBehaviorMetrics({})).resolves.toBeDefined();
  });

  it('returns avgSessionDuration: 0 when there are no sessions in audit log', async () => {
    mockUser.count.mockResolvedValue(50);
    mockSequelize.query.mockResolvedValue([]); // no session data

    const result = await AnalyticsService.getUserBehaviorMetrics({});

    expect(result.avgSessionDuration).toBe(0);
  });

  it('computes average session duration from audit log data', async () => {
    mockUser.count
      .mockResolvedValueOnce(10) // totalUsers
      .mockResolvedValueOnce(2) // newUsers
      .mockResolvedValueOnce(3) // activeFromMessages
      .mockResolvedValueOnce(3) // activeFromApplications
      .mockResolvedValueOnce(3) // activeFromLogins
      .mockResolvedValueOnce(2); // previousPeriod

    const baseTime = new Date('2025-01-15T10:00:00Z');
    const endTime = new Date('2025-01-15T10:30:00Z'); // 30 min session

    // First query = sessionData, second query = topActivities
    mockSequelize.query
      .mockResolvedValueOnce([
        {
          user_id: 'u1',
          session_date: '2025-01-15',
          first_action: baseTime,
          last_action: endTime,
        },
      ])
      .mockResolvedValueOnce([]); // no activities

    const result = await AnalyticsService.getUserBehaviorMetrics({});

    expect(result.avgSessionDuration).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// getPlatformMetrics
// ---------------------------------------------------------------------------
describe('AnalyticsService.getPlatformMetrics', () => {
  it('returns a valid response when pg_stat_statements is unavailable (graceful fallback)', async () => {
    mockAuditLog.count.mockResolvedValue(0);
    mockPet.count.mockResolvedValue(0);

    // avgResponseTime query, dbStats query succeed; slowQueries query throws
    mockSequelize.query
      .mockResolvedValueOnce([{ avg_response_time: null }]) // response time
      .mockResolvedValueOnce([
        // dbStats
        { active_connections: 2, total_transactions: 100, total_blocks: 50, cache_hit_ratio: 95 },
      ])
      .mockRejectedValueOnce(new Error('relation "pg_stat_statements" does not exist')) // slowQueries
      .mockResolvedValueOnce([
        // storage stats
        {
          total_images: 0,
          pet_photos: 0,
          documents: 0,
          avatars: 0,
          avg_file_size: 0,
          total_storage_bytes: 0,
        },
      ]);

    await expect(AnalyticsService.getPlatformMetrics({})).resolves.toBeDefined();
  });

  it('returns slowQueryCount: 0 when pg_stat_statements returns no slow queries', async () => {
    mockAuditLog.count.mockResolvedValue(0);
    mockPet.count.mockResolvedValue(0);

    mockSequelize.query
      .mockResolvedValueOnce([{ avg_response_time: null }])
      .mockResolvedValueOnce([
        { active_connections: 1, total_transactions: 0, total_blocks: 0, cache_hit_ratio: 0 },
      ])
      .mockResolvedValueOnce([{ count: 0 }]) // slowQueries = 0
      .mockResolvedValueOnce([
        {
          total_images: 0,
          pet_photos: 0,
          documents: 0,
          avatars: 0,
          avg_file_size: 0,
          total_storage_bytes: 0,
        },
      ]);

    const result = await AnalyticsService.getPlatformMetrics({});

    expect(result.databasePerformance.slowQueries).toBe(0);
  });

  it('does not throw when any sub-query returns empty result', async () => {
    mockAuditLog.count.mockResolvedValue(0);
    mockPet.count.mockResolvedValue(0);

    mockSequelize.query.mockResolvedValue([]);

    await expect(AnalyticsService.getPlatformMetrics({})).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getApplicationMetrics
// ---------------------------------------------------------------------------
describe('AnalyticsService.getApplicationMetrics', () => {
  it('returns correct status breakdown counts for each application status', async () => {
    mockApplication.findAll
      .mockResolvedValueOnce([
        // applicationsByStatus
        { status: 'pending', count: '5' },
        { status: 'approved', count: '3' },
        { status: 'rejected', count: '2' },
      ])
      .mockResolvedValueOnce([]) // applicationTrends
      .mockResolvedValueOnce([]); // completedApplications

    const result = await AnalyticsService.getApplicationMetrics({});

    expect(result.statusMetrics.pending).toBe(5);
    expect(result.statusMetrics.approved).toBe(3);
    expect(result.statusMetrics.rejected).toBe(2);
    expect(result.totalApplications).toBe(10);
  });

  it('returns avgProcessingTime: 0 when no applications have been resolved', async () => {
    mockApplication.findAll
      .mockResolvedValueOnce([]) // no status data
      .mockResolvedValueOnce([]) // no trends
      .mockResolvedValueOnce([]); // no completed apps

    const result = await AnalyticsService.getApplicationMetrics({});

    expect(result.avgProcessingTime).toBe(0);
    expect(isNaN(result.avgProcessingTime)).toBe(false);
  });

  it('calculates avgProcessingTime in hours for completed applications', async () => {
    const createdAt = new Date('2025-01-01T00:00:00Z');
    const updatedAt = new Date('2025-01-03T00:00:00Z'); // 48 hours later

    mockApplication.findAll
      .mockResolvedValueOnce([]) // no status breakdown
      .mockResolvedValueOnce([]) // no trends
      .mockResolvedValueOnce([{ createdAt, updatedAt }]); // one completed app

    const result = await AnalyticsService.getApplicationMetrics({});

    expect(result.avgProcessingTime).toBe(48);
  });

  it('returns approvalRate: 0 when no approved or rejected applications exist', async () => {
    mockApplication.findAll
      .mockResolvedValueOnce([{ status: 'pending', count: '5' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await AnalyticsService.getApplicationMetrics({});

    expect(result.approvalRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getCommunicationMetrics
// ---------------------------------------------------------------------------
describe('AnalyticsService.getCommunicationMetrics', () => {
  it('returns averageResponseTime: 0 when no messages exist', async () => {
    mockChat.count.mockResolvedValue(0);
    mockMessage.count.mockResolvedValue(0);
    mockMessage.findAll.mockResolvedValue([]);
    mockSequelize.query.mockResolvedValue([{ avg_response_time: null }]);

    const result = await AnalyticsService.getCommunicationMetrics({});

    expect(result.avgResponseTime).toBe(0);
    expect(isNaN(result.avgResponseTime)).toBe(false);
  });

  it('excludes responses older than 24 hours from average response time (handled in SQL)', async () => {
    mockChat.count.mockResolvedValue(5);
    mockMessage.count.mockResolvedValue(20);
    mockMessage.findAll.mockResolvedValue([]);
    // The SQL query filters response_time_minutes <= 1440. The returned avg reflects only valid responses.
    mockSequelize.query.mockResolvedValue([{ avg_response_time: 15.5 }]);

    const result = await AnalyticsService.getCommunicationMetrics({});

    expect(result.avgResponseTime).toBe(15.5);
  });

  it('returns avgMessagesPerChat: 0 when there are no chats', async () => {
    mockChat.count.mockResolvedValue(0);
    mockMessage.count.mockResolvedValue(0);
    mockMessage.findAll.mockResolvedValue([]);
    mockSequelize.query.mockResolvedValue([{ avg_response_time: null }]);

    const result = await AnalyticsService.getCommunicationMetrics({});

    expect(result.avgMessagesPerChat).toBe(0);
    expect(isNaN(result.avgMessagesPerChat)).toBe(false);
  });

  it('calculates chatEngagementRate as 0 when there are no chats', async () => {
    mockChat.count.mockResolvedValue(0);
    mockMessage.count.mockResolvedValue(0);
    mockMessage.findAll.mockResolvedValue([]);
    mockSequelize.query.mockResolvedValue([{ avg_response_time: null }]);

    const result = await AnalyticsService.getCommunicationMetrics({});

    expect(result.chatEngagementRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getDashboardAnalytics
// ---------------------------------------------------------------------------
describe('AnalyticsService.getDashboardAnalytics', () => {
  it('returns complete object with all sub-metric keys even on empty DB', async () => {
    // All model counts return 0
    mockUser.count.mockResolvedValue(0);
    mockApplication.count.mockResolvedValue(0);
    mockApplication.findAll.mockResolvedValue([]);
    mockAuditLog.count.mockResolvedValue(0);
    mockChat.count.mockResolvedValue(0);
    mockMessage.count.mockResolvedValue(0);
    mockMessage.findAll.mockResolvedValue([]);
    mockPet.count.mockResolvedValue(0);
    mockSequelize.query.mockResolvedValue([]);

    const result = await AnalyticsService.getDashboardAnalytics();

    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('adoptions');
    expect(result).toHaveProperty('platform');
    expect(result).toHaveProperty('applications');
    expect(result).toHaveProperty('communication');
    expect(result).toHaveProperty('generatedAt');
  });

  it('does not throw when any sub-query returns empty result', async () => {
    mockUser.count.mockResolvedValue(0);
    mockApplication.count.mockResolvedValue(0);
    mockApplication.findAll.mockResolvedValue([]);
    mockAuditLog.count.mockResolvedValue(0);
    mockChat.count.mockResolvedValue(0);
    mockMessage.count.mockResolvedValue(0);
    mockMessage.findAll.mockResolvedValue([]);
    mockPet.count.mockResolvedValue(0);
    mockSequelize.query.mockResolvedValue([]);

    await expect(AnalyticsService.getDashboardAnalytics()).resolves.toBeDefined();
  });

  it('includes generatedAt timestamp in the response', async () => {
    mockUser.count.mockResolvedValue(0);
    mockApplication.count.mockResolvedValue(0);
    mockApplication.findAll.mockResolvedValue([]);
    mockAuditLog.count.mockResolvedValue(0);
    mockChat.count.mockResolvedValue(0);
    mockMessage.count.mockResolvedValue(0);
    mockMessage.findAll.mockResolvedValue([]);
    mockPet.count.mockResolvedValue(0);
    mockSequelize.query.mockResolvedValue([]);

    const before = new Date();
    const result = await AnalyticsService.getDashboardAnalytics();
    const after = new Date();

    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 100);
  });
});

// ---------------------------------------------------------------------------
// getRealTimeStats
// ---------------------------------------------------------------------------
describe('AnalyticsService.getRealTimeStats', () => {
  it('returns pendingApplications: 0 when none are pending', async () => {
    mockUser.count.mockResolvedValue(0);
    mockApplication.count
      .mockResolvedValueOnce(0) // newApplicationsToday
      .mockResolvedValueOnce(0); // pendingApplications
    mockMessage.count.mockResolvedValue(0);
    mockPet.count.mockResolvedValue(0);
    mockChat.count.mockResolvedValue(0);

    const result = await AnalyticsService.getRealTimeStats();

    expect(result.pendingApplications).toBe(0);
  });

  it('returns all expected real-time keys in the response', async () => {
    mockUser.count.mockResolvedValue(3);
    mockApplication.count.mockResolvedValue(1);
    mockMessage.count.mockResolvedValue(10);
    mockPet.count.mockResolvedValue(2);
    mockChat.count.mockResolvedValue(4);

    const result = await AnalyticsService.getRealTimeStats();

    expect(result).toHaveProperty('activeUsers');
    expect(result).toHaveProperty('newApplicationsToday');
    expect(result).toHaveProperty('messagesLastHour');
    expect(result).toHaveProperty('newPetsToday');
    expect(result).toHaveProperty('activeChats');
    expect(result).toHaveProperty('pendingApplications');
    expect(result).toHaveProperty('timestamp');
  });

  it('returns correct counts when applications are pending', async () => {
    mockUser.count.mockResolvedValue(0);
    mockApplication.count
      .mockResolvedValueOnce(5) // newApplicationsToday
      .mockResolvedValueOnce(7); // pendingApplications
    mockMessage.count.mockResolvedValue(0);
    mockPet.count.mockResolvedValue(0);
    mockChat.count.mockResolvedValue(0);

    const result = await AnalyticsService.getRealTimeStats();

    expect(result.newApplicationsToday).toBe(5);
    expect(result.pendingApplications).toBe(7);
  });
});
