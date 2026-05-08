import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import sequelize from '../../sequelize';

// Mock only external services
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue(undefined),
    getLogs: vi.fn().mockResolvedValue({ rows: [], count: 0 }),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));

import User from '../../models/User';
import AdminService from '../../services/admin.service';

const collect = async (stream: NodeJS.ReadableStream): Promise<string> => {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf-8'));
  }
  return chunks.join('');
};

describe('AdminService.streamExport [ADS-421]', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  it('streams an empty JSON array when there are no rows', async () => {
    const stream = AdminService.streamExport('users', 'json');
    const out = await collect(stream);
    expect(JSON.parse(out)).toEqual([]);
  });

  it('streams users as a valid JSON array, excluding password', async () => {
    await User.create({
      userId: 'user-1',
      firstName: 'Ann',
      lastName: 'Smith',
      email: 'ann@example.com',
      password: 'a-very-long-password-that-passes',
    });
    await User.create({
      userId: 'user-2',
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
      password: 'a-very-long-password-that-passes',
    });

    const stream = AdminService.streamExport('users', 'json');
    const out = await collect(stream);
    const parsed = JSON.parse(out) as Array<{ email: string; password?: string }>;

    expect(parsed).toHaveLength(2);
    expect(parsed.map(u => u.email).sort()).toEqual(['ann@example.com', 'bob@example.com']);
    expect(parsed[0].password).toBeUndefined();
    expect(parsed[1].password).toBeUndefined();
  });

  it('streams JSONL with one user per line', async () => {
    await User.create({
      userId: 'user-1',
      firstName: 'Ann',
      lastName: 'Smith',
      email: 'ann@example.com',
      password: 'a-very-long-password-that-passes',
    });

    const stream = AdminService.streamExport('users', 'jsonl');
    const out = await collect(stream);
    const lines = out.trim().split('\n');
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]) as { email: string };
    expect(parsed.email).toBe('ann@example.com');
  });

  it('streams CSV with a header row and quoted commas', async () => {
    await User.create({
      userId: 'user-1',
      firstName: 'Ann, the Great',
      lastName: 'Smith',
      email: 'ann@example.com',
      password: 'a-very-long-password-that-passes',
    });

    const stream = AdminService.streamExport('users', 'csv');
    const out = await collect(stream);
    const [header, dataRow] = out.trim().split('\n');

    expect(header.split(',')).toContain('email');
    expect(dataRow).toContain('"Ann, the Great"');
    expect(dataRow).not.toContain('super-secret');
  });

  it('rejects an unknown data type', () => {
    expect(() => AdminService.streamExport('not-a-thing' as 'users', 'json')).toThrow(
      /Invalid data type/
    );
  });
});
