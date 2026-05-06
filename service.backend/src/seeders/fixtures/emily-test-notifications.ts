import Notification, {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '../../models/Notification';
import { JsonObject } from '../../types/common';

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
  // Optional now — campaign / system notifications don't point at a
  // single entity; their action_url carries the routing.
  related_entity_id: string | null;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const emilyTestNotifications: NotificationSeedData[] = [
  {
    notification_id: '54e37b81-f760-4a3b-a9f6-cf17f8607180',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116', // Emily Davis
    title: 'Application Approved! 🎉',
    message:
      'Great news! Your adoption application for Whiskers has been approved. Please contact us to schedule a meet-and-greet.',
    type: NotificationType.ADOPTION_APPROVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/applications/f89c141a-554d-4f6f-adc3-e5d209f5237e',
      pet_id: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
      pet_name: 'Whiskers',
      application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    },
    related_entity_type: 'application',
    related_entity_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    created_at: new Date('2025-07-13T10:30:00Z'),
    updated_at: new Date('2025-07-13T10:30:00Z'),
  },
  {
    notification_id: '97d2574f-e5f0-4e6e-a2c6-57653a3ab4e4',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'New Message from Paws Rescue Center',
    message: 'Sarah Johnson sent you a message about your application for Luna.',
    type: NotificationType.MESSAGE_RECEIVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/messages/7dfe4c51-930a-443b-aac5-3e42750a2f1a',
      sender_name: 'Sarah Johnson',
      conversation_id: '7dfe4c51-930a-443b-aac5-3e42750a2f1a',
    },
    related_entity_type: 'message',
    related_entity_id: '7dfe4c51-930a-443b-aac5-3e42750a2f1a',
    created_at: new Date('2025-07-13T09:15:00Z'),
    updated_at: new Date('2025-07-13T09:15:00Z'),
  },
  {
    notification_id: '6383f3e9-4cdc-404b-a7c5-f88e87e298e4',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'Perfect Match Found! 🐕',
    message:
      'We found a new dog that matches your preferences: Max, a 3-year-old Golden Retriever.',
    type: NotificationType.PET_AVAILABLE,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/pets/e2ed19e7-29e6-49e8-aa13-fcc3cfe698e2',
      pet_id: 'e2ed19e7-29e6-49e8-aa13-fcc3cfe698e2',
      pet_name: 'Max',
      breed: 'Golden Retriever',
    },
    related_entity_type: 'pet',
    related_entity_id: 'e2ed19e7-29e6-49e8-aa13-fcc3cfe698e2',
    created_at: new Date('2025-07-13T08:45:00Z'),
    updated_at: new Date('2025-07-13T08:45:00Z'),
  },
  {
    notification_id: '1e9481ee-7ef8-464c-a819-b9956c3d3dc6',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'Interview Scheduled',
    message:
      'Your adoption interview has been scheduled for tomorrow at 2:00 PM with Happy Tails Rescue.',
    type: NotificationType.INTERVIEW_SCHEDULED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/interviews/int_001',
      interview_id: 'f6ff9640-6f8d-4a84-ad7a-8c7a75e41242',
      date: '2025-07-14',
      time: '14:00',
      rescue_name: 'Happy Tails Rescue',
    },
    related_entity_type: 'application',
    related_entity_id: 'f6ff9640-6f8d-4a84-ad7a-8c7a75e41242',
    created_at: new Date('2025-07-13T07:30:00Z'),
    updated_at: new Date('2025-07-13T07:30:00Z'),
  },
  {
    notification_id: '4647d2ce-9020-451c-a796-c9be8dfb229e',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'Home Visit Scheduled',
    message:
      'A home visit has been scheduled for Friday at 10:00 AM to complete your adoption process for Bella.',
    type: NotificationType.HOME_VISIT_SCHEDULED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/home-visits/hv_001',
      visit_id: '68c17932-00ac-437b-a801-2476059810f1',
      date: '2025-07-18',
      time: '10:00',
      pet_name: 'Bella',
    },
    related_entity_type: 'application',
    related_entity_id: '68c17932-00ac-437b-a801-2476059810f1',
    created_at: new Date('2025-07-12T16:20:00Z'),
    updated_at: new Date('2025-07-12T16:20:00Z'),
  },
  {
    notification_id: '32b5fd83-31dc-423d-ae25-f0e398cfd78e',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'Vaccination Reminder',
    message: "Don't forget to schedule Whiskers' annual vaccination appointment.",
    type: NotificationType.REMINDER,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/pets/9ff53898-c5c6-4422-a245-54e52d4c4b78/health',
      pet_id: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
      pet_name: 'Whiskers',
      reminder_type: 'vaccination',
    },
    related_entity_type: 'pet',
    related_entity_id: '7e494417-cf24-4fc5-a715-a70772add835',
    created_at: new Date('2025-07-12T14:10:00Z'),
    updated_at: new Date('2025-07-12T14:10:00Z'),
  },
  {
    notification_id: '992255ec-45d9-4283-ade4-287ecf2c5653',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
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
    related_entity_id: 'ccc7a515-b6ca-40d3-a86c-08aafe0f398e',
    created_at: new Date('2025-07-12T13:00:00Z'),
    updated_at: new Date('2025-07-12T13:00:00Z'),
  },
  {
    notification_id: '49a78a69-4713-4a7a-a6a8-ca62ad7e65f0',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'Health Update for Luna',
    message:
      "Luna had her vet checkup today and received a clean bill of health! She's ready for adoption.",
    type: NotificationType.PET_UPDATE,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/pets/756ac9c5-ac22-49eb-a21d-8385d525e6de',
      pet_id: '756ac9c5-ac22-49eb-a21d-8385d525e6de',
      pet_name: 'Luna',
      update_type: 'health',
    },
    related_entity_type: 'pet',
    related_entity_id: '756ac9c5-ac22-49eb-a21d-8385d525e6de',
    created_at: new Date('2025-07-12T11:45:00Z'),
    updated_at: new Date('2025-07-12T11:45:00Z'),
  },
  {
    notification_id: '9f9dcbce-87b2-4a17-a124-b3182f371c5e',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'New Message from Happy Tails Rescue',
    message: 'Maria Garcia replied to your question about adoption fees.',
    type: NotificationType.MESSAGE_RECEIVED,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/messages/0b18f8ee-3ce4-4b96-a0e8-f745ec48a617',
      sender_name: 'Maria Garcia',
      conversation_id: '0b18f8ee-3ce4-4b96-a0e8-f745ec48a617',
    },
    related_entity_type: 'message',
    related_entity_id: '0b18f8ee-3ce4-4b96-a0e8-f745ec48a617',
    created_at: new Date('2025-07-12T10:30:00Z'),
    updated_at: new Date('2025-07-12T10:30:00Z'),
  },
  {
    notification_id: 'c82dbe1e-8a46-4cf5-af43-b538be8369e0',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'Application Under Review',
    message:
      "Your application for Charlie is currently under review. We'll get back to you within 2-3 business days.",
    type: NotificationType.APPLICATION_STATUS,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/applications/56a2a53c-36c5-41df-af76-96b1a5eb0647',
      pet_id: '9101b091-a826-46a7-a8bc-c8f22d94c294',
      pet_name: 'Charlie',
      application_id: '56a2a53c-36c5-41df-af76-96b1a5eb0647',
    },
    related_entity_type: 'application',
    related_entity_id: '56a2a53c-36c5-41df-af76-96b1a5eb0647',
    created_at: new Date('2025-07-12T09:15:00Z'),
    updated_at: new Date('2025-07-12T09:15:00Z'),
  },
  {
    notification_id: 'b2b2eadf-6188-4805-a36e-a71d015b6d94',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'Reference Check Needed',
    message:
      'Please provide contact information for your veterinary reference to complete your application.',
    type: NotificationType.REFERENCE_REQUEST,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/applications/f89c141a-554d-4f6f-adc3-e5d209f5237e/references',
      application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
      reference_type: 'veterinary',
    },
    related_entity_type: 'application',
    related_entity_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    created_at: new Date('2025-07-11T16:45:00Z'),
    updated_at: new Date('2025-07-11T16:45:00Z'),
  },
  {
    notification_id: 'c6a91c61-56c7-4d7c-a210-e79e0b976a0e',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'How is Whiskers doing?',
    message:
      "It's been a month since you adopted Whiskers! We'd love to hear how he's settling in.",
    type: NotificationType.FOLLOW_UP,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.LOW,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/adoptions/adoption_001/follow-up',
      adoption_id: 'f6ee238d-5134-4c89-ab2d-a90c2b844fb0',
      pet_name: 'Whiskers',
    },
    related_entity_type: 'application',
    related_entity_id: 'f6ee238d-5134-4c89-ab2d-a90c2b844fb0',
    created_at: new Date('2025-07-11T15:20:00Z'),
    updated_at: new Date('2025-07-11T15:20:00Z'),
  },
  {
    notification_id: '28f5713f-2cf8-42e9-ac32-36b4f25f28ff',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
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
    // Campaign notification — points at a category page, not a single
    // pet, so related_entity_id stays null. The action_url above
    // carries the routing.
    related_entity_id: null,
    created_at: new Date('2025-07-11T12:00:00Z'),
    updated_at: new Date('2025-07-11T12:00:00Z'),
  },
  {
    notification_id: 'a4b15a25-ded8-4897-ae86-e4ac34f87bd2',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    title: 'Application Expiring Soon',
    message:
      'Your application for Ruby will expire in 3 days. Please complete the remaining requirements.',
    type: NotificationType.REMINDER,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    data: {
      action_url: '/applications/84e87262-08a3-4998-a2c2-5e5dfe5824e3',
      application_id: '84e87262-08a3-4998-a2c2-5e5dfe5824e3',
      pet_name: 'Ruby',
      expires_in_days: 3,
    },
    related_entity_type: 'application',
    related_entity_id: '84e87262-08a3-4998-a2c2-5e5dfe5824e3',
    created_at: new Date('2025-07-11T10:30:00Z'),
    updated_at: new Date('2025-07-11T10:30:00Z'),
  },
  {
    notification_id: 'd703a8be-91c5-44ad-a2bf-ef020570eee0',
    user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
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
    // Cross-rescue event notification — no single rescue id, the
    // action_url above carries the routing.
    related_entity_id: null,
    created_at: new Date('2025-07-10T14:00:00Z'),
    updated_at: new Date('2025-07-10T14:00:00Z'),
  },
];

export async function seedEmilyTestNotifications() {
  for (const notification of emilyTestNotifications) {
    await Notification.findOrCreate({
      paranoid: false,
      where: { notification_id: notification.notification_id },
      defaults: notification,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${emilyTestNotifications.length} test notifications for Emily Davis`);
}
