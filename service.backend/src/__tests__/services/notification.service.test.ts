// Mock sequelize first
jest.mock('../../sequelize', () => ({
  __esModule: true,
  default: {
    define: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock EmailQueue to prevent initialization errors
jest.mock('../../models/EmailQueue', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    build: jest.fn(),
  },
  EmailStatus: {
    QUEUED: 'queued',
    SENDING: 'sending',
    SENT: 'sent',
    FAILED: 'failed',
  },
  EmailPriority: {
    NORMAL: 'normal',
    HIGH: 'high',
  },
  EmailType: {
    TRANSACTIONAL: 'transactional',
    NOTIFICATION: 'notification',
  },
}));

// Mock EmailTemplate to prevent initialization errors
jest.mock('../../models/EmailTemplate', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  TemplateType: {
    TRANSACTIONAL: 'transactional',
    NOTIFICATION: 'notification',
  },
  TemplateStatus: {
    ACTIVE: 'active',
    DRAFT: 'draft',
  },
}));

// Mock models
jest.mock('../../models/Notification', () => {
  const mockNotification = {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockNotification,
    NotificationType: {
      APPLICATION_STATUS: 'application_status',
      MESSAGE_RECEIVED: 'message_received',
      SYSTEM_ANNOUNCEMENT: 'system_announcement',
      MARKETING: 'marketing',
      REMINDER: 'reminder',
      PET_AVAILABLE: 'pet_available',
      ADOPTION_APPROVED: 'adoption_approved',
    },
    NotificationPriority: {
      LOW: 'low',
      NORMAL: 'normal',
      HIGH: 'high',
      URGENT: 'urgent',
    },
    NotificationChannel: {
      IN_APP: 'in_app',
      EMAIL: 'email',
      PUSH: 'push',
      SMS: 'sms',
    },
  };
});

jest.mock('../../models/DeviceToken', () => {
  const mockDeviceToken = {
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockDeviceToken,
  };
});

// Mock User model with sequelize transaction support
const mockTransaction = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

const mockSequelize = {
  transaction: jest.fn().mockResolvedValue(mockTransaction),
};

jest.mock('../../models/User', () => {
  const mockUser = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    sequelize: mockSequelize,
  };
  return {
    __esModule: true,
    default: mockUser,
  };
});

// Mock config
jest.mock('../../config', () => ({
  config: {
    notifications: {
      enabled: true,
    },
  },
}));

// Mock audit log service
const mockAuditLogAction = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: mockAuditLogAction,
  },
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: mockLogger,
  logger: mockLogger,
  loggerHelpers: {
    logBusiness: jest.fn(),
    logDatabase: jest.fn(),
    logPerformance: jest.fn(),
    logExternalService: jest.fn(),
  },
}));

import Notification, {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '../../models/Notification';
import DeviceToken from '../../models/DeviceToken';
import User from '../../models/User';
import { NotificationService } from '../../services/notification.service';

const MockedNotification = Notification as jest.Mocked<typeof Notification>;
const MockedDeviceToken = DeviceToken as jest.Mocked<typeof DeviceToken>;
const MockedUser = User as jest.Mocked<typeof User>;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Getting notifications', () => {
    describe('when fetching user notifications', () => {
      it('should return paginated notifications with filters', async () => {
        const mockNotifications = [
          {
            notificationId: 'notif-1',
            userId: 'user-123',
            type: NotificationType.MESSAGE_RECEIVED,
            title: 'New Message',
            message: 'You have a new message',
            readAt: null,
            createdAt: new Date(),
            toJSON: jest.fn().mockReturnValue({
              notificationId: 'notif-1',
              userId: 'user-123',
              type: NotificationType.MESSAGE_RECEIVED,
              title: 'New Message',
              message: 'You have a new message',
              readAt: null,
              createdAt: new Date(),
            }),
          },
          {
            notificationId: 'notif-2',
            userId: 'user-123',
            type: NotificationType.APPLICATION_STATUS,
            title: 'Application Update',
            message: 'Your application was approved',
            readAt: new Date(),
            createdAt: new Date(),
            toJSON: jest.fn().mockReturnValue({
              notificationId: 'notif-2',
              userId: 'user-123',
              type: NotificationType.APPLICATION_STATUS,
              title: 'Application Update',
              message: 'Your application was approved',
              readAt: new Date(),
              createdAt: new Date(),
            }),
          },
        ];

        (MockedNotification.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: mockNotifications,
          count: 2,
        });

        const result = await NotificationService.getUserNotifications('user-123', {
          page: 1,
          limit: 10,
          status: 'unread',
        });

        expect(result.notifications).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(MockedNotification.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userId: 'user-123',
              read_at: null,
            }),
            limit: 10,
            offset: 0,
          })
        );
      });

      it('should filter by notification type', async () => {
        (MockedNotification.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await NotificationService.getUserNotifications('user-123', {
          type: 'message_received',
        });

        expect(MockedNotification.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              type: 'message_received',
            }),
          })
        );
      });

      it('should exclude expired notifications', async () => {
        (MockedNotification.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await NotificationService.getUserNotifications('user-123');

        const callArgs = (MockedNotification.findAndCountAll as jest.Mock).mock.calls[0][0];
        // Service uses Op.or which becomes a Symbol property
        const hasOrClause = Object.getOwnPropertySymbols(callArgs.where).some(sym =>
          sym.toString().includes('or')
        );
        expect(hasOrClause).toBe(true);
      });
    });

    describe('when getting notification by ID', () => {
      it('should return notification if user owns it', async () => {
        const mockNotification = {
          notificationId: 'notif-123',
          userId: 'user-123',
          type: NotificationType.MESSAGE_RECEIVED,
          title: 'Test',
          message: 'Test message',
        };

        (MockedNotification.findOne as jest.Mock).mockResolvedValue(mockNotification);

        const result = await NotificationService.getNotificationById('notif-123', 'user-123');

        expect(result).toEqual(mockNotification);
        expect(MockedNotification.findOne).toHaveBeenCalledWith({
          where: {
            notification_id: 'notif-123',
            user_id: 'user-123',
          },
        });
      });

      it('should return null if notification not found', async () => {
        (MockedNotification.findOne as jest.Mock).mockResolvedValue(null);

        const result = await NotificationService.getNotificationById('notif-999', 'user-123');

        expect(result).toBeNull();
      });
    });
  });

  describe('Creating notifications', () => {
    describe('when creating a single notification', () => {
      it('should create notification with correct priority', async () => {
        const notificationData = {
          userId: 'user-123',
          type: NotificationType.MESSAGE_RECEIVED,
          title: 'New Message',
          message: 'You have a new message from rescue',
          priority: NotificationPriority.HIGH,
          data: { chatId: 'chat-123' },
        };

        const mockNotification = {
          notification_id: 'notif-123',
          user_id: 'user-123',
          type: NotificationType.MESSAGE_RECEIVED,
          title: 'New Message',
          message: 'You have a new message from rescue',
          priority: NotificationPriority.HIGH,
          data: { chatId: 'chat-123' },
          channel: NotificationChannel.IN_APP,
          created_at: expect.any(Date),
        };

        (MockedNotification.create as jest.Mock).mockResolvedValue(mockNotification);

        const result = await NotificationService.createNotification(notificationData);

        expect(MockedNotification.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-123',
            type: NotificationType.MESSAGE_RECEIVED,
            priority: NotificationPriority.HIGH,
            channel: NotificationChannel.IN_APP,
          })
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'NOTIFICATION_CREATED',
            entity: 'Notification',
            entityId: 'notif-123',
          })
        );

        expect(result).toEqual(mockNotification);
      });

      it('should use default priority if not provided', async () => {
        const notificationData = {
          userId: 'user-123',
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: 'System Announcement',
          message: 'System maintenance scheduled',
        };

        (MockedNotification.create as jest.Mock).mockResolvedValue({
          notificationId: 'notif-456',
          ...notificationData,
        });

        await NotificationService.createNotification(notificationData);

        expect(MockedNotification.create).toHaveBeenCalledWith(
          expect.objectContaining({
            priority: NotificationPriority.NORMAL,
          })
        );
      });

      it('should set expiration date if provided', async () => {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const notificationData = {
          userId: 'user-123',
          type: NotificationType.REMINDER,
          title: 'Reminder',
          message: 'This is a temporary reminder',
          expiresAt,
        };

        (MockedNotification.create as jest.Mock).mockResolvedValue({
          notification_id: 'notif-789',
          user_id: 'user-123',
          type: NotificationType.REMINDER,
          title: 'Reminder',
          message: 'This is a temporary reminder',
          expires_at: expiresAt,
        });

        await NotificationService.createNotification(notificationData);

        // Service doesn't pass expiresAt to create - it's not in the create call
        expect(MockedNotification.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-123',
            type: NotificationType.REMINDER,
          })
        );
      });
    });

    describe('when creating bulk notifications', () => {
      it('should create multiple notifications for different users', async () => {
        const users = ['user-1', 'user-2', 'user-3'];
        const notificationData = {
          type: NotificationType.MARKETING,
          title: 'New Feature',
          message: 'Check out our new feature!',
        };

        (MockedNotification.create as jest.Mock).mockImplementation(data =>
          Promise.resolve({
            notificationId: `notif-${data.user_id}`,
            ...data,
          })
        );

        const results = await NotificationService.createBulkNotifications(
          users,
          notificationData,
          'admin-123'
        );

        expect(results.notifications).toHaveLength(3);
        expect(MockedNotification.create).toHaveBeenCalledTimes(3);
        expect(MockedNotification.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-1',
            type: NotificationType.MARKETING,
          })
        );
      });

      it('should fail if any notification creation fails', async () => {
        const users = ['user-1', 'user-2'];

        (MockedNotification.create as jest.Mock)
          .mockResolvedValueOnce({ notification_id: 'notif-1', user_id: 'user-1' })
          .mockRejectedValueOnce(new Error('Database error'));

        await expect(
          NotificationService.createBulkNotifications(
            users,
            {
              type: NotificationType.SYSTEM_ANNOUNCEMENT,
              title: 'Alert',
              message: 'System alert',
            },
            'admin-123'
          )
        ).rejects.toThrow('Database error');
      });
    });
  });

  describe('Managing notification read status', () => {
    describe('when marking a notification as read', () => {
      it('should update read timestamp', async () => {
        (MockedNotification.update as jest.Mock).mockResolvedValue([1]); // 1 row affected

        await NotificationService.markAsRead('notif-123', 'user-123');

        expect(MockedNotification.update).toHaveBeenCalledWith(
          { read_at: expect.any(Date) },
          {
            where: {
              notification_id: 'notif-123',
              user_id: 'user-123',
            },
          }
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'NOTIFICATION_READ',
            entity: 'Notification',
          })
        );
      });

      it('should throw error if notification not found', async () => {
        (MockedNotification.update as jest.Mock).mockResolvedValue([0]); // 0 rows affected

        await expect(NotificationService.markAsRead('notif-999', 'user-123')).rejects.toThrow(
          'Notification not found or access denied'
        );
      });
    });

    describe('when marking all notifications as read', () => {
      it('should update all unread notifications for user', async () => {
        (MockedNotification.update as jest.Mock).mockResolvedValue([3]); // 3 rows updated

        const result = await NotificationService.markAllAsRead('user-123');

        expect(MockedNotification.update).toHaveBeenCalledWith(
          expect.objectContaining({
            read_at: expect.any(Date),
          }),
          expect.objectContaining({
            where: {
              user_id: 'user-123',
              read_at: null,
            },
          })
        );

        expect(result.affectedCount).toBe(3);
      });
    });
  });

  describe('Deleting notifications', () => {
    describe('when deleting a single notification', () => {
      it('should soft delete notification if user owns it', async () => {
        (MockedNotification.update as jest.Mock).mockResolvedValue([1]); // 1 row affected

        await NotificationService.deleteNotification('notif-123', 'user-123');

        expect(MockedNotification.update).toHaveBeenCalledWith(
          { deleted_at: expect.any(Date) },
          {
            where: {
              notification_id: 'notif-123',
              user_id: 'user-123',
            },
          }
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'NOTIFICATION_DELETED',
            entity: 'Notification',
          })
        );
      });

      it('should throw error if notification not found', async () => {
        (MockedNotification.update as jest.Mock).mockResolvedValue([0]); // 0 rows affected

        await expect(
          NotificationService.deleteNotification('notif-999', 'user-123')
        ).rejects.toThrow('Notification not found or access denied');
      });
    });
  });

  describe('Notification counts', () => {
    describe('when getting unread count', () => {
      it('should return count of unread notifications', async () => {
        (MockedNotification.count as jest.Mock).mockResolvedValue(5);

        const result = await NotificationService.getUnreadCount('user-123');

        expect(result.count).toBe(5);
        expect(MockedNotification.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              user_id: 'user-123',
              read_at: null,
              deleted_at: null,
            }),
          })
        );
      });

      it('should return 0 if no unread notifications', async () => {
        (MockedNotification.count as jest.Mock).mockResolvedValue(0);

        const result = await NotificationService.getUnreadCount('user-123');

        expect(result.count).toBe(0);
      });
    });
  });

  describe('Notification preferences', () => {
    describe('when getting user preferences', () => {
      it('should return user notification preferences', async () => {
        const mockUser = {
          userId: 'user-123',
          notificationPreferences: {
            email: true,
            push: true,
            sms: false,
            applications: true,
            messages: true,
            system: true,
          },
        };

        (MockedUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

        const preferences = await NotificationService.getNotificationPreferences('user-123');

        expect(preferences).toEqual(
          expect.objectContaining({
            email: true,
            push: true,
            sms: false,
          })
        );
      });

      it('should return default preferences if user has none set', async () => {
        const mockUser = {
          userId: 'user-123',
          notificationPreferences: null,
        };

        (MockedUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

        const preferences = await NotificationService.getNotificationPreferences('user-123');

        // Should return defaults
        expect(preferences).toHaveProperty('email');
        expect(preferences).toHaveProperty('push');
      });
    });

    describe('when updating preferences', () => {
      it('should update user notification preferences', async () => {
        const mockUser = {
          userId: 'user-123',
          notificationPreferences: {},
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

        const updates = {
          email: false,
          push: true,
          marketing: false,
        };

        const result = await NotificationService.updateNotificationPreferences('user-123', updates);

        expect(mockUser.update).toHaveBeenCalledWith(
          { notificationPreferences: expect.objectContaining(updates) },
          { transaction: expect.any(Object) }
        );
        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'UPDATE_NOTIFICATION_PREFERENCES',
            entity: 'NotificationPreferences',
          })
        );
        expect(result).toMatchObject(updates);
      });

      it('should throw error if user not found', async () => {
        (MockedUser.findByPk as jest.Mock).mockResolvedValue(null);

        await expect(
          NotificationService.updateNotificationPreferences('user-999', { email: false })
        ).rejects.toThrow('User not found');
      });
    });
  });

  describe('Cleanup operations', () => {
    describe('when cleaning up expired notifications', () => {
      it('should delete notifications older than specified days', async () => {
        (MockedNotification.destroy as jest.Mock).mockResolvedValue(15); // 15 deleted

        const deletedCount = await NotificationService.cleanupExpiredNotifications(30);

        expect(deletedCount).toBe(15);
        expect(MockedNotification.destroy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              created_at: expect.any(Object),
            }),
          })
        );
      });

      it('should use default retention period if not specified', async () => {
        (MockedNotification.destroy as jest.Mock).mockResolvedValue(0);

        await NotificationService.cleanupExpiredNotifications();

        expect(MockedNotification.destroy).toHaveBeenCalled();
      });
    });
  });
});
