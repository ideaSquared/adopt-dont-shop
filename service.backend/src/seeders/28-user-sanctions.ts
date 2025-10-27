import UserSanction, { SanctionType, SanctionReason } from '../models/UserSanction';
import User from '../models/User';
import Report from '../models/Report';
import ModeratorAction from '../models/ModeratorAction';

export async function seedUserSanctions() {
  try {
    const users = await User.findAll({ limit: 10 });
    const reports = await Report.findAll({ limit: 3 });
    const moderatorActions = await ModeratorAction.findAll({ limit: 3 });

    if (users.length < 3) {
      console.log('⚠️  Not enough users found. Skipping user sanctions seeding.');
      return;
    }

    const sanctions = [
      // Active warning
      {
        userId: users[1]?.userId,
        sanctionType: SanctionType.WARNING,
        reason: SanctionReason.INAPPROPRIATE_CONTENT,
        description: 'User posted inappropriate content in pet listings. This is a formal warning.',
        isActive: true,
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        issuedBy: users[0]?.userId,
        issuedByRole: 'ADMIN' as const,
        reportId: reports[0]?.reportId,
        moderatorActionId: moderatorActions[0]?.actionId,
        metadata: {
          warningLevel: 1,
          maxWarningsBeforeSuspension: 3,
        },
        notificationSent: true,
        internalNotes: 'First offense. User acknowledged and removed content.',
        warningCount: 1,
      },

      // Active temporary ban (messaging)
      {
        userId: users[2]?.userId,
        sanctionType: SanctionType.MESSAGING_RESTRICTION,
        reason: SanctionReason.SPAM,
        description: 'User restricted from sending messages for 7 days due to spam behavior.',
        isActive: true,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        duration: 168, // 7 days in hours
        issuedBy: users[0]?.userId,
        issuedByRole: 'MODERATOR' as const,
        reportId: reports[1]?.reportId,
        metadata: {
          messagesSent: 45,
          timeframe: '2 hours',
          spamPattern: 'identical_content',
        },
        notificationSent: true,
        internalNotes: 'User was mass-messaging multiple rescues with identical content.',
        warningCount: 2,
      },

      // Active account restriction
      {
        userId: users[3]?.userId,
        sanctionType: SanctionType.RESTRICTION,
        reason: SanctionReason.TERMS_VIOLATION,
        description: 'Account restricted from creating new applications pending verification.',
        isActive: true,
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        duration: 168,
        issuedBy: users[0]?.userId,
        issuedByRole: 'ADMIN' as const,
        metadata: {
          violationType: 'multiple_simultaneous_applications',
          applicationsCount: 12,
        },
        notificationSent: true,
        internalNotes: 'User applying to 12+ pets simultaneously, violating terms. Reviewing for bot activity.',
      },

      // Active temporary ban
      {
        userId: users[4]?.userId,
        sanctionType: SanctionType.TEMPORARY_BAN,
        reason: SanctionReason.HARASSMENT,
        description: 'User temporarily banned for 14 days due to harassing other users and rescue staff.',
        isActive: true,
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000), // 11 days from now
        duration: 336, // 14 days
        issuedBy: users[0]?.userId,
        issuedByRole: 'ADMIN' as const,
        reportId: reports[2]?.reportId,
        moderatorActionId: moderatorActions[1]?.actionId,
        metadata: {
          reportsCount: 4,
          affectedUsers: 3,
          severity: 'high',
        },
        notificationSent: true,
        internalNotes: 'Multiple users reported harassment. User has history of warnings. Will be permanently banned if behavior continues.',
        warningCount: 3,
      },

      // Permanent ban
      {
        userId: users[5]?.userId,
        sanctionType: SanctionType.PERMANENT_BAN,
        reason: SanctionReason.SCAM_ATTEMPT,
        description: 'User permanently banned for attempting to scam other users and conduct fraudulent transactions.',
        isActive: true,
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        issuedBy: users[0]?.userId,
        issuedByRole: 'SUPER_ADMIN' as const,
        reportId: reports[0]?.reportId,
        moderatorActionId: moderatorActions[2]?.actionId,
        metadata: {
          fraudAmount: 1500,
          affectedUsers: 4,
          evidenceReviewed: true,
          legalActionTaken: true,
        },
        notificationSent: true,
        internalNotes: 'Clear evidence of fraudulent intent. Legal team involved. IP banned.',
      },

      // Permanent ban - repeated violations
      {
        userId: users[6]?.userId,
        sanctionType: SanctionType.PERMANENT_BAN,
        reason: SanctionReason.REPEATED_VIOLATIONS,
        description: 'User permanently banned after multiple violations and failed attempts at rehabilitation.',
        isActive: true,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        issuedBy: users[0]?.userId,
        issuedByRole: 'ADMIN' as const,
        metadata: {
          priorWarnings: 5,
          priorSuspensions: 2,
          violationTypes: ['spam', 'harassment', 'inappropriate_content'],
        },
        notificationSent: true,
        internalNotes: 'User exhausted all chances. Pattern of repeated policy violations despite multiple warnings and suspensions.',
        warningCount: 5,
      },

      // Expired restriction (no longer active)
      {
        userId: users[7]?.userId,
        sanctionType: SanctionType.POSTING_RESTRICTION,
        reason: SanctionReason.SPAM,
        description: 'User was restricted from posting for 3 days. Restriction has now been lifted.',
        isActive: false,
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Ended 7 days ago
        duration: 72,
        issuedBy: users[0]?.userId,
        issuedByRole: 'MODERATOR' as const,
        metadata: {},
        notificationSent: true,
        internalNotes: 'User completed restriction period. No further violations since.',
        warningCount: 1,
      },

      // Sanction with pending appeal
      {
        userId: users[8]?.userId,
        sanctionType: SanctionType.TEMPORARY_BAN,
        reason: SanctionReason.INAPPROPRIATE_CONTENT,
        description: 'User banned for 7 days for posting inappropriate content.',
        isActive: true,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        duration: 168,
        issuedBy: users[0]?.userId,
        issuedByRole: 'MODERATOR' as const,
        appealedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        appealReason: 'I believe this was a misunderstanding. The content was meant to be educational about animal care, not inappropriate.',
        appealStatus: 'pending' as const,
        metadata: {},
        notificationSent: true,
        internalNotes: 'Appeal under review. Need to re-examine original content with context.',
        warningCount: 1,
      },

      // Sanction with approved appeal (revoked)
      {
        userId: users[9]?.userId,
        sanctionType: SanctionType.TEMPORARY_BAN,
        reason: SanctionReason.FALSE_INFORMATION,
        description: 'User was banned for posting false information. Ban revoked after successful appeal.',
        isActive: false,
        startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        duration: 720, // 30 days
        issuedBy: users[0]?.userId,
        issuedByRole: 'MODERATOR' as const,
        appealedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        appealReason: 'The information I posted was based on outdated rescue guidelines. I have since corrected it and apologize for the confusion.',
        appealStatus: 'approved' as const,
        appealResolvedBy: users[0]?.userId,
        appealResolvedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        appealResolution: 'After review, we determined the user acted in good faith with outdated information. Appeal approved and ban lifted.',
        revokedBy: users[0]?.userId,
        revokedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        revocationReason: 'Appeal approved - user provided proof of good faith and corrected information.',
        metadata: {},
        notificationSent: true,
        internalNotes: 'User was cooperative and corrected the information promptly. No malicious intent found.',
      },

      // Sanction with rejected appeal
      {
        userId: users[1]?.userId,
        sanctionType: SanctionType.APPLICATION_RESTRICTION,
        reason: SanctionReason.TERMS_VIOLATION,
        description: 'User restricted from submitting applications for 30 days due to repeated terms violations.',
        isActive: true,
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        duration: 720, // 30 days
        issuedBy: users[0]?.userId,
        issuedByRole: 'ADMIN' as const,
        appealedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        appealReason: 'I disagree with this restriction. I believe my actions were justified.',
        appealStatus: 'rejected' as const,
        appealResolvedBy: users[0]?.userId,
        appealResolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        appealResolution: 'After thorough review, the original decision stands. The violations were clear and documented.',
        metadata: {
          violationsCount: 4,
          documentedEvidence: true,
        },
        notificationSent: true,
        internalNotes: 'User has pattern of violations. Appeal rejected. Restriction remains in place.',
        warningCount: 2,
      },
    ];

    await UserSanction.bulkCreate(sanctions as any);
    console.log(`✅ Created ${sanctions.length} user sanctions`);
  } catch (error) {
    console.error('Error seeding user sanctions:', error);
    throw error;
  }
}
