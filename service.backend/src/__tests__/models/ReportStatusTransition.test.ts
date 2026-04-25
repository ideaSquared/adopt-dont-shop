import { describe, expect, it, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import Report, { ReportCategory, ReportSeverity, ReportStatus } from '../../models/Report';
import ReportStatusTransition from '../../models/ReportStatusTransition';
import User from '../../models/User';

describe('ReportStatusTransition', () => {
  let reporterId: string;
  let moderatorId: string;
  let reportId: string;

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    const reporter = await User.create({
      userId: 'dddddddd-dddd-4ddd-dddd-dddddddddd11',
      email: 'reporter@audit.local',
      password: 'long-enough-password-123',
      firstName: 'A',
      lastName: 'B',
      userType: 'adopter',
      status: 'active',
      emailVerified: true,
    } as never);
    reporterId = reporter.userId;

    const moderator = await User.create({
      userId: 'dddddddd-dddd-4ddd-dddd-dddddddddd22',
      email: 'mod@audit.local',
      password: 'long-enough-password-123',
      firstName: 'M',
      lastName: 'M',
      userType: 'moderator',
      status: 'active',
      emailVerified: true,
    } as never);
    moderatorId = moderator.userId;

    const report = await Report.create({
      reporterId,
      reportedEntityId: 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
      reportedEntityType: 'user',
      category: ReportCategory.HARASSMENT,
      severity: ReportSeverity.MEDIUM,
      title: 'Test report',
      description: 'A test report for transition coverage',
      status: ReportStatus.PENDING,
      evidence: [],
      metadata: {},
    } as never);
    reportId = report.reportId;
  });

  it('inserting a transition updates reports.status', async () => {
    await ReportStatusTransition.create({
      reportId,
      fromStatus: ReportStatus.PENDING,
      toStatus: ReportStatus.UNDER_REVIEW,
      transitionedBy: moderatorId,
      reason: 'Assigned to moderator',
    });

    const reloaded = await Report.findByPk(reportId);
    expect(reloaded?.status).toBe(ReportStatus.UNDER_REVIEW);
  });

  it('captures the resolution path with metadata', async () => {
    await ReportStatusTransition.create({
      reportId,
      fromStatus: ReportStatus.PENDING,
      toStatus: ReportStatus.UNDER_REVIEW,
      transitionedBy: moderatorId,
    });
    await ReportStatusTransition.create({
      reportId,
      fromStatus: ReportStatus.UNDER_REVIEW,
      toStatus: ReportStatus.RESOLVED,
      transitionedBy: moderatorId,
      reason: 'Content removed',
      metadata: { actionType: 'content_removed' },
    });

    const history = await ReportStatusTransition.findAll({
      where: { reportId },
      order: [['transitionedAt', 'ASC']],
    });
    expect(history.map(t => t.toStatus)).toEqual([
      ReportStatus.UNDER_REVIEW,
      ReportStatus.RESOLVED,
    ]);
    expect(history[1].metadata).toMatchObject({ actionType: 'content_removed' });

    const reloaded = await Report.findByPk(reportId);
    expect(reloaded?.status).toBe(ReportStatus.RESOLVED);
  });
});
