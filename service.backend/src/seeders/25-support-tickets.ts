import SupportTicket, {
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '../models/SupportTicket';
import User from '../models/User';

export async function seedSupportTickets() {
  try {
    // Get some users and staff
    const users = await User.findAll({ limit: 10 });
    const staffUsers = await User.findAll({
      limit: 3,
      order: [['createdAt', 'ASC']],
    });

    if (users.length === 0) {
      console.log('⚠️  No users found. Skipping support tickets seeding.');
      return;
    }

    const tickets = [
      // Open tickets
      {
        userId: users[0]?.userId,
        userEmail: users[0]?.email || 'user1@example.com',
        userName: `${users[0]?.firstName || 'John'} ${users[0]?.lastName || 'Doe'}`,
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        category: TicketCategory.TECHNICAL_ISSUE,
        subject: 'Unable to upload pet photos',
        description:
          "I'm trying to upload photos of my rescue dog but keep getting an error message. The page just refreshes and nothing happens.",
        tags: ['upload', 'photos', 'technical'],
        responses: [],
        metadata: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          errorCode: 'UPLOAD_FAILED',
        },
      },
      {
        userId: users[1]?.userId,
        userEmail: users[1]?.email || 'user2@example.com',
        userName: `${users[1]?.firstName || 'Jane'} ${users[1]?.lastName || 'Smith'}`,
        status: TicketStatus.OPEN,
        priority: TicketPriority.URGENT,
        category: TicketCategory.ACCOUNT_PROBLEM,
        subject: 'Cannot access my account',
        description:
          "I've been locked out of my account after too many login attempts. I need access ASAP as I have pending adoption applications.",
        tags: ['account', 'locked', 'urgent'],
        responses: [],
        metadata: {},
      },
      {
        userId: users[2]?.userId,
        userEmail: users[2]?.email || 'user3@example.com',
        userName: `${users[2]?.firstName || 'Bob'} ${users[2]?.lastName || 'Johnson'}`,
        status: TicketStatus.OPEN,
        priority: TicketPriority.NORMAL,
        category: TicketCategory.ADOPTION_INQUIRY,
        subject: 'Question about adoption process timeline',
        description:
          "How long does the typical adoption process take? I submitted my application 2 weeks ago and haven't heard back yet.",
        tags: ['adoption', 'timeline', 'process'],
        responses: [],
        metadata: {},
      },

      // In Progress tickets (assigned)
      {
        userId: users[3]?.userId,
        userEmail: users[3]?.email || 'user4@example.com',
        userName: `${users[3]?.firstName || 'Alice'} ${users[3]?.lastName || 'Williams'}`,
        assignedTo: staffUsers[0]?.userId,
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.HIGH,
        category: TicketCategory.TECHNICAL_ISSUE,
        subject: 'Email notifications not working',
        description:
          "I'm not receiving any email notifications about my application status or messages from rescues.",
        tags: ['email', 'notifications', 'settings'],
        responses: [
          {
            responseId: `response_${Date.now()}_1`,
            responderId: staffUsers[0]?.userId || 'staff1',
            responderType: 'staff' as const,
            content:
              "Thank you for reporting this issue. I've checked your account settings and everything looks correct. Can you please check your spam folder and confirm your email address is correct?",
            attachments: [],
            isInternal: false,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          },
          {
            responseId: `response_${Date.now()}_2`,
            responderId: users[3]?.userId || 'user4',
            responderType: 'user' as const,
            content:
              'Yes, I checked spam and the email address is correct. Still not getting any emails.',
            attachments: [],
            isInternal: false,
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          },
        ],
        firstResponseAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lastResponseAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        metadata: {},
      },
      {
        userId: users[4]?.userId,
        userEmail: users[4]?.email || 'user5@example.com',
        userName: `${users[4]?.firstName || 'Charlie'} ${users[4]?.lastName || 'Brown'}`,
        assignedTo: staffUsers[1]?.userId,
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.NORMAL,
        category: TicketCategory.FEATURE_REQUEST,
        subject: 'Add filter for dog breeds',
        description:
          'It would be really helpful to have a filter option to search for specific dog breeds instead of just scrolling through all pets.',
        tags: ['feature-request', 'search', 'filters'],
        responses: [
          {
            responseId: `response_${Date.now()}_3`,
            responderId: staffUsers[1]?.userId || 'staff2',
            responderType: 'staff' as const,
            content:
              "Great suggestion! I've forwarded this to our product team. We're actually working on enhanced search filters and this will be included.",
            attachments: [],
            isInternal: false,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          },
        ],
        firstResponseAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        lastResponseAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        metadata: {},
      },

      // Waiting for user
      {
        userId: users[5]?.userId,
        userEmail: users[5]?.email || 'user6@example.com',
        userName: `${users[5]?.firstName || 'Diana'} ${users[5]?.lastName || 'Davis'}`,
        assignedTo: staffUsers[0]?.userId,
        status: TicketStatus.WAITING_FOR_USER,
        priority: TicketPriority.NORMAL,
        category: TicketCategory.ACCOUNT_PROBLEM,
        subject: "Can't update my profile information",
        description: "The save button doesn't work when I try to update my address.",
        tags: ['profile', 'update', 'bug'],
        responses: [
          {
            responseId: `response_${Date.now()}_4`,
            responderId: staffUsers[0]?.userId || 'staff1',
            responderType: 'staff' as const,
            content:
              'I need some additional information to help diagnose this. What browser are you using? Are you seeing any error messages?',
            attachments: [],
            isInternal: false,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          },
        ],
        firstResponseAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        lastResponseAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        metadata: {},
      },

      // Resolved tickets
      {
        userId: users[6]?.userId,
        userEmail: users[6]?.email || 'user7@example.com',
        userName: `${users[6]?.firstName || 'Eve'} ${users[6]?.lastName || 'Martinez'}`,
        assignedTo: staffUsers[2]?.userId,
        status: TicketStatus.RESOLVED,
        priority: TicketPriority.NORMAL,
        category: TicketCategory.GENERAL_QUESTION,
        subject: 'How do I favorite a pet?',
        description:
          "I want to save some pets to look at later but can't find the favorite button.",
        tags: ['favorites', 'how-to', 'question'],
        responses: [
          {
            responseId: `response_${Date.now()}_5`,
            responderId: staffUsers[2]?.userId || 'staff3',
            responderType: 'staff' as const,
            content:
              'You can favorite a pet by clicking the heart icon in the top right corner of any pet card. Your favorites will appear in your account under "My Favorites".',
            attachments: [],
            isInternal: false,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          },
          {
            responseId: `response_${Date.now()}_6`,
            responderId: users[6]?.userId || 'user7',
            responderType: 'user' as const,
            content: 'Perfect! Found it. Thank you so much!',
            attachments: [],
            isInternal: false,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 5 days ago + 30 min
          },
        ],
        firstResponseAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastResponseAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        satisfactionRating: 5,
        satisfactionFeedback: 'Very helpful and quick response!',
        metadata: {},
      },
      {
        userId: users[7]?.userId,
        userEmail: users[7]?.email || 'user8@example.com',
        userName: `${users[7]?.firstName || 'Frank'} ${users[7]?.lastName || 'Wilson'}`,
        assignedTo: staffUsers[1]?.userId,
        status: TicketStatus.RESOLVED,
        priority: TicketPriority.LOW,
        category: TicketCategory.DATA_REQUEST,
        subject: 'Request for my personal data',
        description: 'I would like to request a copy of all my personal data per GDPR.',
        tags: ['gdpr', 'data-request', 'privacy'],
        responses: [
          {
            responseId: `response_${Date.now()}_7`,
            responderId: staffUsers[1]?.userId || 'staff2',
            responderType: 'staff' as const,
            content:
              "I've processed your data export request. You'll receive a download link via email within 48 hours.",
            attachments: [],
            isInternal: false,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          },
        ],
        firstResponseAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastResponseAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
        satisfactionRating: 4,
        metadata: {},
      },

      // Escalated ticket
      {
        userId: users[8]?.userId,
        userEmail: users[8]?.email || 'user9@example.com',
        userName: `${users[8]?.firstName || 'Grace'} ${users[8]?.lastName || 'Taylor'}`,
        assignedTo: staffUsers[0]?.userId,
        status: TicketStatus.ESCALATED,
        priority: TicketPriority.CRITICAL,
        category: TicketCategory.COMPLIANCE_CONCERN,
        subject: 'Suspected fraudulent rescue organization',
        description:
          "I believe one of the rescue organizations on your platform may be operating fraudulently. They're asking for large upfront fees and their address doesn't exist.",
        tags: ['fraud', 'compliance', 'investigation'],
        responses: [
          {
            responseId: `response_${Date.now()}_8`,
            responderId: staffUsers[0]?.userId || 'staff1',
            responderType: 'staff' as const,
            content:
              "Thank you for bringing this to our attention. This is a serious matter that requires immediate investigation. I'm escalating this to our compliance team.",
            attachments: [],
            isInternal: false,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          },
        ],
        firstResponseAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lastResponseAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        escalatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        escalatedTo: staffUsers[2]?.userId,
        escalationReason: 'Potential fraud requires immediate investigation by compliance team',
        internalNotes: 'Customer provided screenshots and detailed evidence. Needs urgent review.',
        metadata: {
          severity: 'critical',
          rescueId: 'rescue_suspicious_001',
        },
      },

      // Closed ticket
      {
        userId: users[9]?.userId,
        userEmail: users[9]?.email || 'user10@example.com',
        userName: `${users[9]?.firstName || 'Henry'} ${users[9]?.lastName || 'Anderson'}`,
        assignedTo: staffUsers[1]?.userId,
        status: TicketStatus.CLOSED,
        priority: TicketPriority.LOW,
        category: TicketCategory.GENERAL_QUESTION,
        subject: 'What are your operating hours?',
        description: 'When is support available to answer questions?',
        tags: ['hours', 'support', 'info'],
        responses: [
          {
            responseId: `response_${Date.now()}_9`,
            responderId: staffUsers[1]?.userId || 'staff2',
            responderType: 'staff' as const,
            content:
              "Our support team is available Monday-Friday 9am-6pm EST. You can submit tickets anytime and we'll respond during business hours.",
            attachments: [],
            isInternal: false,
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          },
        ],
        firstResponseAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lastResponseAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
        closedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        satisfactionRating: 5,
        metadata: {},
      },
    ];

    await SupportTicket.bulkCreate(tickets as unknown);
    console.log(`✅ Created ${tickets.length} support tickets`);
  } catch (error) {
    console.error('Error seeding support tickets:', error);
    throw error;
  }
}
