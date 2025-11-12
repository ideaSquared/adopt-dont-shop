import ModeratorAction, { ActionType, ActionSeverity } from '../models/ModeratorAction';
import User from '../models/User';
import Report from '../models/Report';

export async function seedModeratorActions() {
  try {
    const users = await User.findAll({ limit: 10 });
    const reports = await Report.findAll({ limit: 5 });

    if (users.length < 2) {
      console.log('⚠️  Not enough users found. Skipping moderator actions seeding.');
      return;
    }

    const actions = [
      // Warning issued
      {
        moderatorId: users[0]?.userId,
        reportId: reports[0]?.reportId,
        targetEntityType: 'user' as const,
        targetEntityId: users[1]?.userId,
        targetUserId: users[1]?.userId,
        actionType: ActionType.WARNING_ISSUED,
        severity: ActionSeverity.LOW,
        reason: 'Inappropriate language in messages',
        description:
          'User used inappropriate language when communicating with rescue organization. First offense - warning issued.',
        metadata: {},
        isActive: true,
        evidence: [
          {
            type: 'screenshot' as const,
            content: 'message_screenshot.png',
            description: 'Messages containing inappropriate language',
          },
        ],
        notificationSent: true,
        internalNotes: 'User apologized and agreed to follow communication guidelines.',
      },

      // Content removed
      {
        moderatorId: users[0]?.userId,
        reportId: reports[1]?.reportId,
        targetEntityType: 'pet' as const,
        targetEntityId: 'pet_123',
        actionType: ActionType.CONTENT_REMOVED,
        severity: ActionSeverity.MEDIUM,
        reason: 'Listing violated platform policies',
        description:
          "Pet listing contained prohibited content and misleading information about the animal's health status.",
        metadata: {
          policyViolation: 'misleading_health_info',
        },
        isActive: true,
        evidence: [],
        notificationSent: true,
        internalNotes: 'Rescue contacted and educated about listing requirements.',
      },

      // User suspended (temporary)
      {
        moderatorId: users[1]?.userId,
        reportId: reports[2]?.reportId,
        targetEntityType: 'user' as const,
        targetEntityId: users[2]?.userId,
        targetUserId: users[2]?.userId,
        actionType: ActionType.USER_SUSPENDED,
        severity: ActionSeverity.HIGH,
        reason: 'Repeated policy violations',
        description:
          'User has violated platform policies multiple times despite warnings. Temporary suspension of 7 days.',
        metadata: {
          previousWarnings: 2,
          violationType: 'harassment',
        },
        duration: 168, // 7 days in hours
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        evidence: [
          {
            type: 'text' as const,
            content: 'User received 2 prior warnings on: 2024-01-15, 2024-02-20',
          },
        ],
        notificationSent: true,
        internalNotes:
          'User will be permanently banned if violations continue after suspension ends.',
      },

      // Account restricted
      {
        moderatorId: users[0]?.userId,
        targetEntityType: 'user' as const,
        targetEntityId: users[3]?.userId,
        targetUserId: users[3]?.userId,
        actionType: ActionType.ACCOUNT_RESTRICTED,
        severity: ActionSeverity.MEDIUM,
        reason: 'Suspicious activity detected',
        description:
          'Account restricted due to unusual activity pattern. User can view but cannot message or apply until verification.',
        metadata: {
          activityPattern: 'rapid_application_creation',
          flaggedCount: 15,
        },
        duration: 72, // 3 days
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isActive: true,
        evidence: [],
        notificationSent: true,
        internalNotes: 'Awaiting identity verification from user.',
      },

      // User banned (permanent)
      {
        moderatorId: users[1]?.userId,
        reportId: reports[3]?.reportId,
        targetEntityType: 'user' as const,
        targetEntityId: users[4]?.userId,
        targetUserId: users[4]?.userId,
        actionType: ActionType.USER_BANNED,
        severity: ActionSeverity.CRITICAL,
        reason: 'Fraudulent activity',
        description:
          'User engaged in fraudulent scheme to scam adopters. Permanent ban issued immediately.',
        metadata: {
          fraudType: 'fake_adoption_fees',
          affectedUsers: 5,
          estimatedLoss: 2500,
        },
        isActive: true,
        evidence: [
          {
            type: 'url' as const,
            content: 'internal_investigation_doc_456',
            description: 'Full investigation report',
          },
          {
            type: 'text' as const,
            content: 'Multiple users reported payment requests outside platform',
          },
        ],
        notificationSent: true,
        internalNotes:
          'Legal team notified. May pursue criminal charges. All affected users have been contacted and refunded.',
      },

      // Content flagged
      {
        moderatorId: users[0]?.userId,
        targetEntityType: 'message' as const,
        targetEntityId: 'msg_789',
        actionType: ActionType.CONTENT_FLAGGED,
        severity: ActionSeverity.LOW,
        reason: 'Potential spam content',
        description: 'Message flagged for review due to promotional language. Under investigation.',
        metadata: {
          autoFlagged: true,
          algorithmConfidence: 0.75,
        },
        isActive: true,
        evidence: [],
        notificationSent: false,
        internalNotes: 'Automated flag - needs human review to confirm spam.',
      },

      // Escalation
      {
        moderatorId: users[0]?.userId,
        reportId: reports[4]?.reportId,
        targetEntityType: 'rescue' as const,
        targetEntityId: 'rescue_456',
        actionType: ActionType.ESCALATION,
        severity: ActionSeverity.CRITICAL,
        reason: 'Complex case requiring senior review',
        description:
          'Rescue organization showing multiple red flags. Case escalated to compliance team for full investigation.',
        metadata: {
          redFlags: ['unlicensed', 'high_complaint_rate', 'financial_irregularities'],
          requiresLegalReview: true,
        },
        isActive: true,
        evidence: [
          {
            type: 'url' as const,
            content: 'compliance_report_789',
            description: 'Initial compliance assessment',
          },
        ],
        notificationSent: false,
        internalNotes:
          'Escalated to Sarah (Senior Moderator) and Legal team. Hold all new applications until investigation complete.',
      },

      // Report dismissed
      {
        moderatorId: users[1]?.userId,
        targetEntityType: 'user' as const,
        targetEntityId: users[5]?.userId,
        targetUserId: users[5]?.userId,
        actionType: ActionType.REPORT_DISMISSED,
        severity: ActionSeverity.LOW,
        reason: 'Report unfounded after investigation',
        description:
          'After thorough review, the reported content did not violate any platform policies. Report dismissed.',
        metadata: {
          reviewTime: 45, // minutes
        },
        isActive: false,
        evidence: [],
        notificationSent: true,
        internalNotes:
          'Reporter was filing frivolous reports. Warned about misuse of reporting system.',
      },

      // Expired action (previously active, now expired)
      {
        moderatorId: users[0]?.userId,
        targetEntityType: 'user' as const,
        targetEntityId: users[6]?.userId,
        targetUserId: users[6]?.userId,
        actionType: ActionType.USER_SUSPENDED,
        severity: ActionSeverity.MEDIUM,
        reason: 'Spam behavior',
        description:
          'User suspended for 24 hours due to sending spam messages. Suspension has now ended.',
        metadata: {},
        duration: 24,
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // Expired 1 hour ago
        isActive: false,
        evidence: [],
        notificationSent: true,
        internalNotes: 'User suspended for 24 hours. No further violations since reinstatement.',
      },
    ];

    await ModeratorAction.bulkCreate(actions as unknown);
    console.log(`✅ Created ${actions.length} moderator actions`);
  } catch (error) {
    console.error('Error seeding moderator actions:', error);
    throw error;
  }
}
