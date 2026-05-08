import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sequelize from '../../sequelize';
import User, { UserStatus, UserType } from '../../models/User';
import Report, { ReportStatus, ReportCategory, ReportSeverity } from '../../models/Report';
import moderationService from '../../services/moderation.service';

describe('ModerationService.enrichReportsWithEntityContext [ADS-478]', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await Report.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  it('returns the input untouched when there are no reports', async () => {
    const service = moderationService;
    const result = await service.enrichReportsWithEntityContext([]);
    expect(result).toEqual([]);
  });

  it('issues one batched query per entity type, not per report', async () => {
    const reporter = await User.create({
      email: 'reporter@example.com',
      password: 'hashedpassword',
      firstName: 'Reporter',
      lastName: 'User',
      userType: UserType.ADOPTER,
      status: UserStatus.ACTIVE,
    });

    // Create 5 distinct reported users so the cache can't dedupe.
    const reportedUsers: User[] = [];
    for (let i = 0; i < 5; i += 1) {
      reportedUsers.push(
        await User.create({
          email: `reported${i}@example.com`,
          password: 'hashedpassword',
          firstName: `R${i}`,
          lastName: 'User',
          userType: UserType.ADOPTER,
          status: UserStatus.ACTIVE,
        })
      );
    }

    const reports: Report[] = [];
    for (let i = 0; i < 5; i += 1) {
      reports.push(
        await Report.create({
          reporterId: reporter.userId,
          reportedEntityType: 'user',
          reportedEntityId: reportedUsers[i].userId,
          reportedUserId: reportedUsers[i].userId,
          category: ReportCategory.INAPPROPRIATE_CONTENT,
          severity: ReportSeverity.HIGH,
          title: `Report ${i}`,
          description: 'A sufficiently long test description for validation purposes.',
          evidence: [],
          status: ReportStatus.PENDING,
        })
      );
    }

    const findByPkSpy = vi.spyOn(User, 'findByPk');
    const findAllSpy = vi.spyOn(User, 'findAll');

    const service = moderationService;
    const enriched = await service.enrichReportsWithEntityContext(reports);

    // Old N+1 path: one findByPk per report. New path: one findAll for the lot.
    expect(findByPkSpy).not.toHaveBeenCalled();
    expect(findAllSpy).toHaveBeenCalledTimes(1);
    expect(enriched).toHaveLength(5);

    // Order is preserved and each report carries the right context.
    enriched.forEach((report, i) => {
      const ctx = report.entityContext as { id: string; displayName: string; type: string };
      expect(ctx.type).toBe('user');
      expect(ctx.id).toBe(reportedUsers[i].userId);
      expect(ctx.displayName).toBe(`R${i} User`);
    });

    findByPkSpy.mockRestore();
    findAllSpy.mockRestore();
  });

  it('marks missing entities as deleted', async () => {
    const reporter = await User.create({
      email: 'reporter2@example.com',
      password: 'hashedpassword',
      firstName: 'R',
      lastName: 'User',
      userType: UserType.ADOPTER,
      status: UserStatus.ACTIVE,
    });

    // Create then delete the reported user so the report references a missing row.
    const ghostUser = await User.create({
      email: 'ghost@example.com',
      password: 'hashedpassword',
      firstName: 'Ghost',
      lastName: 'User',
      userType: UserType.ADOPTER,
      status: UserStatus.ACTIVE,
    });
    const ghostId = ghostUser.userId;

    const report = await Report.create({
      reporterId: reporter.userId,
      reportedEntityType: 'user',
      reportedEntityId: ghostId,
      reportedUserId: ghostId,
      category: ReportCategory.INAPPROPRIATE_CONTENT,
      severity: ReportSeverity.HIGH,
      title: 'Ghost Report',
      description: 'A sufficiently long test description for validation purposes.',
      evidence: [],
      status: ReportStatus.PENDING,
    });

    await ghostUser.destroy({ force: true });

    const service = moderationService;
    const enriched = await service.enrichReportsWithEntityContext([report]);

    const ctx = enriched[0].entityContext as { deleted?: boolean; displayName: string };
    expect(ctx.deleted).toBe(true);
    expect(ctx.displayName).toBe('[Deleted User]');
  });
});
