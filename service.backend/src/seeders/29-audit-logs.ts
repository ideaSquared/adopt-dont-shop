import AuditLog from '../models/AuditLog';

const auditLogs = [
  // Admin actions
  {
    service: 'adopt-dont-shop-backend',
    user: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    action: 'LOGIN',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    metadata: {
      entity: 'auth',
      entityId: '0cbbd913-c94c-4254-a028-81b76df89c9f',
      details: { method: 'email_password' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    category: 'AUTH',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  {
    service: 'adopt-dont-shop-backend',
    user: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    action: 'UPDATE',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    metadata: {
      entity: 'rescue',
      entityId: 'rescue_hopeful_paws_001',
      details: {
        changes: {
          verificationStatus: { from: 'pending', to: 'verified' },
        },
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    category: 'RESCUE',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  {
    service: 'adopt-dont-shop-backend',
    user: '7599debb-3d71-497c-a6e9-a2aa255d77df',
    action: 'CREATE',
    level: 'WARNING' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    metadata: {
      entity: 'user_sanction',
      entityId: 'sanction_001',
      details: {
        targetUserId: 'fc369713-6925-4f02-a5c6-cb84b3652116',
        type: 'warning',
        reason: 'Inappropriate language in chat',
      },
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    category: 'MODERATION',
    ip_address: '192.168.1.105',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  },
  {
    service: 'adopt-dont-shop-backend',
    user: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    action: 'DELETE',
    level: 'WARNING' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    metadata: {
      entity: 'pet',
      entityId: '25f54e60-636a-44e8-abb4-d4d1c9e41476',
      details: {
        reason: 'Duplicate entry',
        petName: 'Max',
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    category: 'PET',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },

  // Rescue organization actions
  {
    service: 'adopt-dont-shop-backend',
    user: '3d7065c5-82a3-4bba-a84e-78229365badd',
    action: 'CREATE',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    metadata: {
      entity: 'pet',
      entityId: 'e2ed19e7-29e6-49e8-aa13-fcc3cfe698e2',
      details: {
        petName: 'Max',
        species: 'dog',
        breed: 'Golden Retriever',
      },
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36',
    },
    category: 'PET',
    ip_address: '10.0.0.50',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36',
  },
  {
    service: 'adopt-dont-shop-backend',
    user: '3d7065c5-82a3-4bba-a84e-78229365badd',
    action: 'UPDATE',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    metadata: {
      entity: 'application',
      entityId: '8bed2ed8-6c46-4017-a885-4ca237673895',
      details: {
        changes: {
          status: { from: 'pending', to: 'approved' },
        },
        applicantName: 'Emily Adopter',
      },
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36',
    },
    category: 'APPLICATION',
    ip_address: '10.0.0.50',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36',
  },

  // Failed login attempts
  {
    service: 'adopt-dont-shop-backend',
    user: null,
    action: 'LOGIN',
    level: 'ERROR' as const,
    status: 'failure' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    metadata: {
      entity: 'auth',
      entityId: null,
      details: {
        email: 'hacker@example.com',
        reason: 'Invalid credentials',
      },
      ipAddress: '203.0.113.42',
      userAgent: 'curl/7.68.0',
    },
    category: 'AUTH',
    ip_address: '203.0.113.42',
    user_agent: 'curl/7.68.0',
  },
  {
    service: 'adopt-dont-shop-backend',
    user: null,
    action: 'LOGIN',
    level: 'ERROR' as const,
    status: 'failure' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8 - 1000 * 30), // 8 hours 30 seconds ago
    metadata: {
      entity: 'auth',
      entityId: null,
      details: {
        email: 'admin@adoptdontshop.dev',
        reason: 'Invalid password',
      },
      ipAddress: '203.0.113.42',
      userAgent: 'curl/7.68.0',
    },
    category: 'AUTH',
    ip_address: '203.0.113.42',
    user_agent: 'curl/7.68.0',
  },

  // Support ticket actions
  {
    service: 'adopt-dont-shop-backend',
    user: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    action: 'UPDATE',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    metadata: {
      entity: 'support_ticket',
      entityId: 'ticket_001',
      details: {
        changes: {
          status: { from: 'open', to: 'resolved' },
        },
        subject: 'Unable to upload pet photos',
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    category: 'SUPPORT',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },

  // System configuration changes
  {
    service: 'adopt-dont-shop-backend',
    user: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    action: 'UPDATE',
    level: 'WARNING' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    metadata: {
      entity: 'system_setting',
      entityId: 'session_timeout',
      details: {
        changes: {
          value: { from: 60, to: 120 },
        },
        setting: 'session_timeout_minutes',
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    category: 'SYSTEM',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },

  // Bulk operations
  {
    service: 'adopt-dont-shop-backend',
    user: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    action: 'BULK_UPDATE',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    metadata: {
      entity: 'pet',
      entityId: null,
      details: {
        operation: 'status_update',
        count: 15,
        filter: { rescueId: 'rescue_hopeful_paws_001' },
        changes: { status: 'available' },
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    category: 'PET',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },

  // User management
  {
    service: 'adopt-dont-shop-backend',
    user: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    action: 'USER_SUSPENDED',
    level: 'WARNING' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    metadata: {
      entity: 'user',
      entityId: 'user_spam_001',
      details: {
        reason: 'Spam activity detected',
        duration: '7_days',
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    category: 'USER',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },

  // Password reset
  {
    service: 'adopt-dont-shop-backend',
    user: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    action: 'PASSWORD_RESET',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    metadata: {
      entity: 'auth',
      entityId: 'fc369713-6925-4f02-a5c6-cb84b3652116',
      details: {
        method: 'email_link',
      },
      ipAddress: '172.16.0.25',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    },
    category: 'AUTH',
    ip_address: '172.16.0.25',
    user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  },

  // Email verification
  {
    service: 'adopt-dont-shop-backend',
    user: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30',
    action: 'EMAIL_VERIFICATION',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 6 days ago
    metadata: {
      entity: 'auth',
      entityId: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30',
      details: {
        email: 'michael.brown@outlook.com',
      },
      ipAddress: '172.16.0.30',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    category: 'AUTH',
    ip_address: '172.16.0.30',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  },

  // Rescue verification
  {
    service: 'adopt-dont-shop-backend',
    user: '0cbbd913-c94c-4254-a028-81b76df89c9f',
    action: 'RESCUE_VERIFIED',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    metadata: {
      entity: 'rescue',
      entityId: 'rescue_new_shelter_001',
      details: {
        rescueName: 'New Hope Animal Shelter',
        verifiedDocuments: ['501c3', 'license', 'facility_photos'],
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    category: 'RESCUE',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
];

export async function up() {
  console.log('🌱 Seeding audit logs...');

  try {
    await AuditLog.bulkCreate(auditLogs);
    console.log(`✅ Created ${auditLogs.length} audit log entries`);
  } catch (error) {
    console.error('❌ Error seeding audit logs:', error);
    throw error;
  }
}

export async function down() {
  console.log('🗑️  Removing audit logs...');
  await AuditLog.destroy({ where: {} });
  console.log('✅ Audit logs removed');
}
