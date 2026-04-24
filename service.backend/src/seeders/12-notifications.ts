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
    notification_id: 'b1c744fb-06fc-48be-a0c6-37084ab01ef3',
    user_id: '98915d9e-69ed-46b2-a897-57d8469ff360',
    title: 'Application Received',
    message:
      'Thank you for your application for Buddy! We have received it and will review it within 2-3 business days.',
    type: NotificationType.APPLICATION_STATUS,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.READ,
    data: {
      application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
      pet_name: 'Buddy',
      rescue_name: 'Paws Rescue Austin',
      action_url: '/applications/f89c141a-554d-4f6f-adc3-e5d209f5237e',
    },
    related_entity_type: 'application',
    related_entity_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    created_at: new Date('2024-02-15T10:35:00Z'),
    updated_at: new Date('2024-02-15T10:35:00Z'),
  },
  {
    notification_id: '4a81e150-000a-4a04-a40e-884f237992e2',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'Application Approved! 🎉',
    message:
      'Congratulations! Your application for Whiskers has been approved. Please contact us to schedule a meet and greet.',
    type: NotificationType.ADOPTION_APPROVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.READ,
    data: {
      application_id: '56a2a53c-36c5-41df-af76-96b1a5eb0647',
      pet_name: 'Whiskers',
      rescue_name: 'Furry Friends Portland',
      action_url: '/applications/56a2a53c-36c5-41df-af76-96b1a5eb0647',
    },
    related_entity_type: 'application',
    related_entity_id: '56a2a53c-36c5-41df-af76-96b1a5eb0647',
    read_at: new Date('2024-02-20T16:30:00Z'),
    created_at: new Date('2024-02-20T14:50:00Z'),
    updated_at: new Date('2024-02-20T16:30:00Z'),
  },
  {
    notification_id: 'a7363b65-7e15-4961-a60d-e981f8f63598',
    user_id: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30',
    title: 'Interview Scheduled',
    message:
      'Your phone interview for Rocky has been scheduled. We will contact you this week to discuss the next steps.',
    type: NotificationType.INTERVIEW_SCHEDULED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      application_id: '84e87262-08a3-4998-a2c2-5e5dfe5824e3',
      pet_name: 'Rocky',
      rescue_name: 'Happy Tails Senior Dog Rescue',
      action_url: '/applications/84e87262-08a3-4998-a2c2-5e5dfe5824e3',
    },
    related_entity_type: 'application',
    related_entity_id: '84e87262-08a3-4998-a2c2-5e5dfe5824e3',
    created_at: new Date('2024-02-18T09:20:00Z'),
    updated_at: new Date('2024-02-18T09:20:00Z'),
  },
  {
    notification_id: 'e2e57593-6e2e-473b-a00b-5d567689d1ff',
    user_id: '5f0c8a14-a37f-469e-a0fe-222db23d4fbd',
    title: 'Application Update',
    message:
      "Thank you for your interest in Luna. Unfortunately, we feel that a more experienced cat owner would be a better fit for Luna's high-energy needs. We encourage you to consider one of our calmer senior cats.",
    type: NotificationType.ADOPTION_REJECTED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      application_id: '166bce5d-d9e8-45e4-aaad-6dff23e72c61',
      pet_name: 'Luna',
      rescue_name: 'Paws Rescue Austin',
      action_url: '/applications/166bce5d-d9e8-45e4-aaad-6dff23e72c61',
    },
    related_entity_type: 'application',
    related_entity_id: '166bce5d-d9e8-45e4-aaad-6dff23e72c61',
    created_at: new Date('2024-02-19T11:35:00Z'),
    updated_at: new Date('2024-02-19T11:35:00Z'),
  },
  {
    notification_id: 'c4557d33-fc57-4015-a2f8-046ad59a8d2a',
    user_id: '378118eb-9e97-4940-adeb-0a53b252b057',
    title: 'New Application Received',
    message:
      'A new application has been submitted for Buddy by John Smith. Please review at your earliest convenience.',
    type: NotificationType.APPLICATION_STATUS,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.READ,
    data: {
      application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
      pet_name: 'Buddy',
      applicant_name: 'John Smith',
      action_url: '/admin/applications/f89c141a-554d-4f6f-adc3-e5d209f5237e',
    },
    related_entity_type: 'application',
    related_entity_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    read_at: new Date('2024-02-15T11:00:00Z'),
    created_at: new Date('2024-02-15T10:32:00Z'),
    updated_at: new Date('2024-02-15T11:00:00Z'),
  },
  {
    notification_id: '6c6a5f4b-0f52-4a6f-ad25-0bcbfa89e811',
    user_id: 'c283bd85-11ce-4494-add0-b06896d38e2d',
    title: 'Reference Check Complete',
    message:
      "All references for Michael Brown's application for Rocky have been verified successfully.",
    type: NotificationType.REFERENCE_REQUEST,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      application_id: '84e87262-08a3-4998-a2c2-5e5dfe5824e3',
      pet_name: 'Rocky',
      applicant_name: 'Michael Brown',
      action_url: '/admin/applications/84e87262-08a3-4998-a2c2-5e5dfe5824e3',
    },
    related_entity_type: 'application',
    related_entity_id: '84e87262-08a3-4998-a2c2-5e5dfe5824e3',
    created_at: new Date('2024-02-17T16:45:00Z'),
    updated_at: new Date('2024-02-17T16:45:00Z'),
  },
  {
    notification_id: '6236c096-abaf-4bb4-aa6d-13b1905d02a8',
    user_id: '98915d9e-69ed-46b2-a897-57d8469ff360',
    title: 'New Message from Paws Rescue Austin',
    message: "Sarah from Paws Rescue has sent you a message about Buddy's exercise needs.",
    type: NotificationType.MESSAGE_RECEIVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      chat_id: '7dfe4c51-930a-443b-aac5-3e42750a2f1a',
      sender_name: 'Sarah Johnson',
      rescue_name: 'Paws Rescue Austin',
      action_url: '/chat/7dfe4c51-930a-443b-aac5-3e42750a2f1a',
    },
    related_entity_type: 'message',
    related_entity_id: '7dfe4c51-930a-443b-aac5-3e42750a2f1a',
    created_at: new Date('2024-02-16T15:50:00Z'),
    updated_at: new Date('2024-02-16T15:50:00Z'),
  },
];

export async function seedNotifications() {
  for (const notification of notificationData) {
    await Notification.findOrCreate({
      paranoid: false,
      where: { notification_id: notification.notification_id },
      defaults: notification,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${notificationData.length} notifications`);
}
