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

const emilyTestNotifications: NotificationSeedData[] = [
  {
    notification_id: 'notif_emily_001',
    user_id: 'user_adopter_002', // Emily Davis
    title: 'Application Approved! 🎉',
    message:
      'Great news! Your adoption application for Whiskers has been approved. Please contact us to schedule a meet-and-greet.',
    type: NotificationType.ADOPTION_APPROVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/applications/app_001',
      pet_id: 'pet_001',
      pet_name: 'Whiskers',
      application_id: 'app_001',
    },
    related_entity_type: 'application',
    related_entity_id: 'app_001',
    created_at: new Date('2025-07-13T10:30:00Z'),
    updated_at: new Date('2025-07-13T10:30:00Z'),
  },
  {
    notification_id: 'notif_emily_002',
    user_id: 'user_adopter_002',
    title: 'New Message from Paws Rescue Center',
    message: 'Sarah Johnson sent you a message about your application for Luna.',
    type: NotificationType.MESSAGE_RECEIVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/messages/conv_001',
      sender_name: 'Sarah Johnson',
      conversation_id: 'conv_001',
    },
    related_entity_type: 'message',
    related_entity_id: 'conv_001',
    created_at: new Date('2025-07-13T09:15:00Z'),
    updated_at: new Date('2025-07-13T09:15:00Z'),
  },
  {
    notification_id: 'notif_emily_003',
    user_id: 'user_adopter_002',
    title: 'Perfect Match Found! 🐕',
    message:
      'We found a new dog that matches your preferences: Max, a 3-year-old Golden Retriever.',
    type: NotificationType.PET_AVAILABLE,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/pets/pet_new_001',
      pet_id: 'pet_new_001',
      pet_name: 'Max',
      breed: 'Golden Retriever',
    },
    related_entity_type: 'pet',
    related_entity_id: 'pet_new_001',
    created_at: new Date('2025-07-13T08:45:00Z'),
    updated_at: new Date('2025-07-13T08:45:00Z'),
  },
  {
    notification_id: 'notif_emily_004',
    user_id: 'user_adopter_002',
    title: 'Interview Scheduled',
    message:
      'Your adoption interview has been scheduled for tomorrow at 2:00 PM with Happy Tails Rescue.',
    type: NotificationType.INTERVIEW_SCHEDULED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/interviews/int_001',
      interview_id: 'int_001',
      date: '2025-07-14',
      time: '14:00',
      rescue_name: 'Happy Tails Rescue',
    },
    related_entity_type: 'application',
    related_entity_id: 'int_001',
    created_at: new Date('2025-07-13T07:30:00Z'),
    updated_at: new Date('2025-07-13T07:30:00Z'),
  },
  {
    notification_id: 'notif_emily_005',
    user_id: 'user_adopter_002',
    title: 'Home Visit Scheduled',
    message:
      'A home visit has been scheduled for Friday at 10:00 AM to complete your adoption process for Bella.',
    type: NotificationType.HOME_VISIT_SCHEDULED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/home-visits/hv_001',
      visit_id: 'hv_001',
      date: '2025-07-18',
      time: '10:00',
      pet_name: 'Bella',
    },
    related_entity_type: 'application',
    related_entity_id: 'hv_001',
    created_at: new Date('2025-07-12T16:20:00Z'),
    updated_at: new Date('2025-07-12T16:20:00Z'),
  },
  {
    notification_id: 'notif_emily_006',
    user_id: 'user_adopter_002',
    title: 'Vaccination Reminder',
    message: "Don't forget to schedule Whiskers' annual vaccination appointment.",
    type: NotificationType.REMINDER,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/pets/pet_001/health',
      pet_id: 'pet_001',
      pet_name: 'Whiskers',
      reminder_type: 'vaccination',
    },
    related_entity_type: 'pet',
    related_entity_id: 'reminder_001',
    created_at: new Date('2025-07-12T14:10:00Z'),
    updated_at: new Date('2025-07-12T14:10:00Z'),
  },
  {
    notification_id: 'notif_emily_007',
    user_id: 'user_adopter_002',
    title: 'Platform Maintenance Notice',
    message:
      'Scheduled maintenance will occur on Sunday from 2:00 AM to 4:00 AM EST. Some features may be temporarily unavailable.',
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.LOW,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/announcements/maint_001',
      maintenance_date: '2025-07-20',
      start_time: '02:00',
      end_time: '04:00',
    },
    related_entity_type: 'user',
    related_entity_id: 'maint_001',
    created_at: new Date('2025-07-12T13:00:00Z'),
    updated_at: new Date('2025-07-12T13:00:00Z'),
  },
  {
    notification_id: 'notif_emily_008',
    user_id: 'user_adopter_002',
    title: 'Health Update for Luna',
    message:
      "Luna had her vet checkup today and received a clean bill of health! She's ready for adoption.",
    type: NotificationType.PET_UPDATE,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/pets/pet_002',
      pet_id: 'pet_002',
      pet_name: 'Luna',
      update_type: 'health',
    },
    related_entity_type: 'pet',
    related_entity_id: 'pet_002',
    created_at: new Date('2025-07-12T11:45:00Z'),
    updated_at: new Date('2025-07-12T11:45:00Z'),
  },
  {
    notification_id: 'notif_emily_009',
    user_id: 'user_adopter_002',
    title: 'New Message from Happy Tails Rescue',
    message: 'Maria Garcia replied to your question about adoption fees.',
    type: NotificationType.MESSAGE_RECEIVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/messages/conv_002',
      sender_name: 'Maria Garcia',
      conversation_id: 'conv_002',
    },
    related_entity_type: 'message',
    related_entity_id: 'conv_002',
    created_at: new Date('2025-07-12T10:30:00Z'),
    updated_at: new Date('2025-07-12T10:30:00Z'),
  },
  {
    notification_id: 'notif_emily_010',
    user_id: 'user_adopter_002',
    title: 'Application Under Review',
    message:
      "Your application for Charlie is currently under review. We'll get back to you within 2-3 business days.",
    type: NotificationType.APPLICATION_STATUS,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/applications/app_002',
      pet_id: 'pet_003',
      pet_name: 'Charlie',
      application_id: 'app_002',
    },
    related_entity_type: 'application',
    related_entity_id: 'app_002',
    created_at: new Date('2025-07-12T09:15:00Z'),
    updated_at: new Date('2025-07-12T09:15:00Z'),
  },
  {
    notification_id: 'notif_emily_011',
    user_id: 'user_adopter_002',
    title: 'Reference Check Needed',
    message:
      'Please provide contact information for your veterinary reference to complete your application.',
    type: NotificationType.REFERENCE_REQUEST,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/applications/app_001/references',
      application_id: 'app_001',
      reference_type: 'veterinary',
    },
    related_entity_type: 'application',
    related_entity_id: 'app_001',
    created_at: new Date('2025-07-11T16:45:00Z'),
    updated_at: new Date('2025-07-11T16:45:00Z'),
  },
  {
    notification_id: 'notif_emily_012',
    user_id: 'user_adopter_002',
    title: 'How is Whiskers doing?',
    message:
      "It's been a month since you adopted Whiskers! We'd love to hear how he's settling in.",
    type: NotificationType.FOLLOW_UP,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.LOW,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/adoptions/adoption_001/follow-up',
      adoption_id: 'adoption_001',
      pet_name: 'Whiskers',
    },
    related_entity_type: 'application',
    related_entity_id: 'adoption_001',
    created_at: new Date('2025-07-11T15:20:00Z'),
    updated_at: new Date('2025-07-11T15:20:00Z'),
  },
  {
    notification_id: 'notif_emily_013',
    user_id: 'user_adopter_002',
    title: 'New Cats Available! 🐱',
    message:
      'Three new cats matching your preferences just arrived: Mittens, Shadow, and Princess.',
    type: NotificationType.PET_AVAILABLE,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/pets?category=cats&new=true',
      new_pets_count: 3,
      pet_names: ['Mittens', 'Shadow', 'Princess'],
    },
    related_entity_type: 'pet',
    related_entity_id: 'pet_cats_new',
    created_at: new Date('2025-07-11T12:00:00Z'),
    updated_at: new Date('2025-07-11T12:00:00Z'),
  },
  {
    notification_id: 'notif_emily_014',
    user_id: 'user_adopter_002',
    title: 'Application Expiring Soon',
    message:
      'Your application for Ruby will expire in 3 days. Please complete the remaining requirements.',
    type: NotificationType.REMINDER,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/applications/app_003',
      application_id: 'app_003',
      pet_name: 'Ruby',
      expires_in_days: 3,
    },
    related_entity_type: 'application',
    related_entity_id: 'app_003',
    created_at: new Date('2025-07-11T10:30:00Z'),
    updated_at: new Date('2025-07-11T10:30:00Z'),
  },
  {
    notification_id: 'notif_emily_015',
    user_id: 'user_adopter_002',
    title: 'Special Adoption Event This Weekend!',
    message:
      'Join us for our "Clear the Shelters" event with reduced adoption fees and special activities.',
    type: NotificationType.MARKETING,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.LOW,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/events/clear-shelters-2025',
      event_date: '2025-07-19',
      discount_percentage: 50,
    },
    related_entity_type: 'rescue',
    related_entity_id: 'clear-shelters-2025',
    created_at: new Date('2025-07-10T14:00:00Z'),
    updated_at: new Date('2025-07-10T14:00:00Z'),
  },
];

export async function seedEmilyTestNotifications() {
  for (const notification of emilyTestNotifications) {
    await Notification.findOrCreate({
      where: { notification_id: notification.notification_id },
      defaults: notification,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${emilyTestNotifications.length} test notifications for Emily Davis`);
}
