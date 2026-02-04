import Notification, {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '../models/Notification';
import { JsonObject } from '../types/common';

interface NotificationSeedData {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  data: JsonObject;
  related_entity_type: string;
  related_entity_id: string;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const notificationData: NotificationSeedData[] = [
  {
    notification_id: 'notif_001',
    user_id: 'user_0000adopt01',
    title: 'Application Received',
    message:
      'Thank you for your application for Buddy! We have received it and will review it within 2-3 business days.',
    type: NotificationType.APPLICATION_STATUS,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.READ,
    data: {
      application_id: 'application_0000bjon001',
      pet_name: 'Buddy',
      rescue_name: 'Paws Rescue Austin',
      action_url: '/applications/application_0000bjon001',
    },
    related_entity_type: 'application',
    related_entity_id: 'application_0000bjon001',
    created_at: new Date('2024-02-15T10:35:00Z'),
    updated_at: new Date('2024-02-15T10:35:00Z'),
  },
  {
    notification_id: 'notif_002',
    user_id: 'user_0000adopt02',
    title: 'Application Approved! 🎉',
    message:
      'Congratulations! Your application for Whiskers has been approved. Please contact us to schedule a meet and greet.',
    type: NotificationType.ADOPTION_APPROVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.READ,
    data: {
      application_id: 'application_0000wemi001',
      pet_name: 'Whiskers',
      rescue_name: 'Furry Friends Portland',
      action_url: '/applications/application_0000wemi001',
    },
    related_entity_type: 'application',
    related_entity_id: 'application_0000wemi001',
    read_at: new Date('2024-02-20T16:30:00Z'),
    created_at: new Date('2024-02-20T14:50:00Z'),
    updated_at: new Date('2024-02-20T16:30:00Z'),
  },
  {
    notification_id: 'notif_003',
    user_id: 'user_0000adopt03',
    title: 'Interview Scheduled',
    message:
      'Your phone interview for Rocky has been scheduled. We will contact you this week to discuss the next steps.',
    type: NotificationType.INTERVIEW_SCHEDULED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      application_id: 'application_0000rmic001',
      pet_name: 'Rocky',
      rescue_name: 'Happy Tails Senior Dog Rescue',
      action_url: '/applications/application_0000rmic001',
    },
    related_entity_type: 'application',
    related_entity_id: 'application_0000rmic001',
    created_at: new Date('2024-02-18T09:20:00Z'),
    updated_at: new Date('2024-02-18T09:20:00Z'),
  },
  {
    notification_id: 'notif_004',
    user_id: 'user_0000adopt04',
    title: 'Application Update',
    message:
      "Thank you for your interest in Luna. Unfortunately, we feel that a more experienced cat owner would be a better fit for Luna's high-energy needs. We encourage you to consider one of our calmer senior cats.",
    type: NotificationType.ADOPTION_REJECTED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      application_id: 'application_0000ljes001',
      pet_name: 'Luna',
      rescue_name: 'Paws Rescue Austin',
      action_url: '/applications/application_0000ljes001',
    },
    related_entity_type: 'application',
    related_entity_id: 'application_0000ljes001',
    created_at: new Date('2024-02-19T11:35:00Z'),
    updated_at: new Date('2024-02-19T11:35:00Z'),
  },
  {
    notification_id: 'notif_005',
    user_id: 'user_0000rscst01',
    title: 'New Application Received',
    message:
      'A new application has been submitted for Buddy by John Smith. Please review at your earliest convenience.',
    type: NotificationType.APPLICATION_STATUS,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.READ,
    data: {
      application_id: 'application_0000bjon001',
      pet_name: 'Buddy',
      applicant_name: 'John Smith',
      action_url: '/admin/applications/application_0000bjon001',
    },
    related_entity_type: 'application',
    related_entity_id: 'application_0000bjon001',
    read_at: new Date('2024-02-15T11:00:00Z'),
    created_at: new Date('2024-02-15T10:32:00Z'),
    updated_at: new Date('2024-02-15T11:00:00Z'),
  },
  {
    notification_id: 'notif_006',
    user_id: 'user_0000rscad02',
    title: 'Reference Check Complete',
    message:
      "All references for Michael Brown's application for Rocky have been verified successfully.",
    type: NotificationType.REFERENCE_REQUEST,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      application_id: 'application_0000rmic001',
      pet_name: 'Rocky',
      applicant_name: 'Michael Brown',
      action_url: '/admin/applications/application_0000rmic001',
    },
    related_entity_type: 'application',
    related_entity_id: 'application_0000rmic001',
    created_at: new Date('2024-02-17T16:45:00Z'),
    updated_at: new Date('2024-02-17T16:45:00Z'),
  },
  {
    notification_id: 'notif_007',
    user_id: 'user_0000adopt01',
    title: 'New Message from Paws Rescue Austin',
    message: "Sarah from Paws Rescue has sent you a message about Buddy's exercise needs.",
    type: NotificationType.MESSAGE_RECEIVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      chat_id: 'chat_buddy_john_001',
      sender_name: 'Sarah Johnson',
      rescue_name: 'Paws Rescue Austin',
      action_url: '/chat/chat_buddy_john_001',
    },
    related_entity_type: 'message',
    related_entity_id: 'chat_buddy_john_001',
    created_at: new Date('2024-02-16T15:50:00Z'),
    updated_at: new Date('2024-02-16T15:50:00Z'),
  },
];

export async function seedNotifications() {
  for (const notification of notificationData) {
    await Notification.findOrCreate({
      where: { notification_id: notification.notification_id },
      defaults: notification,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${notificationData.length} notifications`);
}
