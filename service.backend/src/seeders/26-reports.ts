import Report, { ReportStatus, ReportCategory, ReportSeverity } from '../models/Report';
import User from '../models/User';
import Pet from '../models/Pet';
import Rescue from '../models/Rescue';
import Chat from '../models/Chat';
import Message from '../models/Message';

export async function seedReports() {
  try {
    // Get users for reporters and reported users
    const users = await User.findAll({ limit: 10 });
    const pets = await Pet.findAll({ limit: 5 });
    const rescues = await Rescue.findAll({ limit: 3 });
    const chats = await Chat.findAll({ limit: 5 });
    const messages = await Message.findAll({ limit: 10 });

    if (users.length < 2) {
      console.log('⚠️  Not enough users found. Skipping reports seeding.');
      return;
    }

    // Filter to only create reports with valid entity IDs
    const validReports = [];

    // Pending report 1: Message harassment
    if (messages.length > 0 && users.length > 1) {
      validReports.push({
        reporterId: users[0].userId,
        reportedEntityType: 'message' as const,
        reportedEntityId: messages[0].message_id,
        reportedUserId: users[1].userId,
        category: ReportCategory.HARASSMENT,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.PENDING,
        title: 'Harassing messages from user',
        description:
          'This user has been sending me repeated unwanted messages despite me asking them to stop. The messages are becoming increasingly aggressive.',
        evidence: [
          {
            type: 'text' as const,
            content: 'Multiple messages received over 3 days',
            description: 'Pattern of harassment',
            uploadedAt: new Date(),
          },
        ],
        metadata: {
          messageCount: 12,
          timespan: '3 days',
        },
      });
    }

    // Pending report 2: Animal welfare
    if (pets.length > 0 && users.length > 3) {
      validReports.push({
        reporterId: users[2].userId,
        reportedEntityType: 'pet' as const,
        reportedEntityId: pets[0].pet_id,
        reportedUserId: users[3].userId,
        category: ReportCategory.ANIMAL_WELFARE,
        severity: ReportSeverity.CRITICAL,
        status: ReportStatus.PENDING,
        title: 'Suspected animal abuse in listing photos',
        description:
          'The photos of this pet show signs of neglect and possible abuse. The animal appears malnourished and has visible injuries.',
        evidence: [
          {
            type: 'screenshot' as const,
            content: 'photo_evidence_001.jpg',
            description: 'Visible injuries on animal',
            uploadedAt: new Date(),
          },
        ],
        metadata: {
          urgent: true,
          requiresImediateAction: true,
        },
      });
    }

    // Pending report 3: User spam
    if (users.length > 5) {
      validReports.push({
        reporterId: users[4].userId,
        reportedEntityType: 'user' as const,
        reportedEntityId: users[5].userId,
        reportedUserId: users[5].userId,
        category: ReportCategory.SPAM,
        severity: ReportSeverity.MEDIUM,
        status: ReportStatus.PENDING,
        title: 'User posting spam in messages',
        description:
          'This user is sending the same promotional message to multiple people about their pet-sitting business.',
        evidence: [],
        metadata: {
          reportCount: 3,
          sameContent: true,
        },
      });
    }

    // Under review report 1: Misleading pet info
    if (pets.length > 1 && users.length > 7) {
      validReports.push({
        reporterId: users[6].userId,
        reportedEntityType: 'pet' as const,
        reportedEntityId: pets[1].pet_id,
        reportedUserId: users[7].userId,
        category: ReportCategory.FALSE_INFORMATION,
        severity: ReportSeverity.MEDIUM,
        status: ReportStatus.UNDER_REVIEW,
        title: 'Misleading pet information',
        description:
          'The pet is listed as "good with kids" but has a bite history that was disclosed during the application process.',
        evidence: [
          {
            type: 'text' as const,
            content: 'Rescue confirmed bite history in private communication',
            uploadedAt: new Date(),
          },
        ],
        assignedModerator: users[0].userId,
        assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        metadata: {},
      });
    }

    // Under review report 2: Inappropriate chat content
    if (chats.length > 0 && users.length > 9) {
      validReports.push({
        reporterId: users[8].userId,
        reportedEntityType: 'conversation' as const,
        reportedEntityId: chats[0].chat_id,
        reportedUserId: users[9].userId,
        category: ReportCategory.INAPPROPRIATE_CONTENT,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.UNDER_REVIEW,
        title: 'Inappropriate content in chat',
        description:
          'User sent inappropriate images and made suggestive comments unrelated to pet adoption.',
        evidence: [
          {
            type: 'screenshot' as const,
            content: 'chat_screenshot_001.png',
            description: 'Inappropriate messages',
            uploadedAt: new Date(),
          },
        ],
        assignedModerator: users[1].userId,
        assignedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        metadata: {
          requiresAdultReview: true,
        },
      });
    }

    // Resolved report 1: Scam
    if (users.length > 4) {
      validReports.push({
        reporterId: users[3].userId,
        reportedEntityType: 'user' as const,
        reportedEntityId: users[4].userId,
        reportedUserId: users[4].userId,
        category: ReportCategory.SCAM,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.RESOLVED,
        title: 'User requesting payment outside platform',
        description:
          'User asked me to send money via PayPal for "adoption fees" instead of going through the official process.',
        evidence: [
          {
            type: 'screenshot' as const,
            content: 'paypal_request.png',
            description: 'Payment request outside platform',
            uploadedAt: new Date(),
          },
        ],
        assignedModerator: users[0].userId,
        assignedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        resolvedBy: users[0].userId,
        resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        resolution: 'user_suspended',
        resolutionNotes:
          'User account suspended for attempting to conduct transactions outside platform. User has been permanently banned.',
        metadata: {
          userBanned: true,
        },
      });
    }

    // Resolved report 2: Duplicate listing
    if (pets.length > 2 && users.length > 5) {
      validReports.push({
        reporterId: users[5].userId,
        reportedEntityType: 'pet' as const,
        reportedEntityId: pets[2].pet_id,
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.RESOLVED,
        title: 'Duplicate pet listing',
        description: 'This pet appears to be listed multiple times under different names.',
        evidence: [],
        assignedModerator: users[1].userId,
        assignedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resolvedBy: users[1].userId,
        resolvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        resolution: 'content_removed',
        resolutionNotes: 'Duplicate listings removed. Rescue notified about posting guidelines.',
        metadata: {},
      });
    }

    // Dismissed report: Rude response
    if (messages.length > 1 && users.length > 8) {
      validReports.push({
        reporterId: users[7].userId,
        reportedEntityType: 'message' as const,
        reportedEntityId: messages[1].message_id,
        reportedUserId: users[8].userId,
        category: ReportCategory.HARASSMENT,
        severity: ReportSeverity.LOW,
        status: ReportStatus.DISMISSED,
        title: 'Rude response to application',
        description: 'The rescue sent me a mean message saying my application was denied.',
        evidence: [],
        assignedModerator: users[0].userId,
        assignedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        resolvedBy: users[0].userId,
        resolvedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        resolution: 'no_action',
        resolutionNotes:
          'After review, the message was professional and explained valid reasons for denial. No harassment occurred.',
        metadata: {},
      });
    }

    // Escalated report: Fraudulent rescue
    if (rescues.length > 0 && users.length > 9) {
      validReports.push({
        reporterId: users[9].userId,
        reportedEntityType: 'rescue' as const,
        reportedEntityId: rescues[0].rescueId,
        reportedUserId: users[2].userId,
        category: ReportCategory.SCAM,
        severity: ReportSeverity.CRITICAL,
        status: ReportStatus.ESCALATED,
        title: 'Fraudulent rescue organization',
        description:
          'This rescue is collecting "adoption fees" but never delivering animals. Multiple people have complained online.',
        evidence: [
          {
            type: 'url' as const,
            content: 'https://example.com/complaints',
            description: 'Multiple online complaints',
            uploadedAt: new Date(),
          },
          {
            type: 'text' as const,
            content: 'Collected $500 from me, never received pet, rescue stopped responding',
            uploadedAt: new Date(),
          },
        ],
        assignedModerator: users[0].userId,
        assignedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        escalatedTo: users[1].userId,
        escalatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        escalationReason:
          'Potential fraud ring affecting multiple users. Requires legal review and immediate investigation.',
        metadata: {
          affectedUserCount: 8,
          totalAmountScammed: 4000,
          requiresLegalAction: true,
        },
      });
    }

    if (validReports.length === 0) {
      console.log('⚠️  Not enough data to create reports. Skipping reports seeding.');
      return;
    }

    await Report.bulkCreate(validReports as any);
    console.log(`✅ Created ${validReports.length} moderation reports`);
  } catch (error) {
    console.error('Error seeding reports:', error);
    throw error;
  }
}
