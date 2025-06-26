import Notification from '../models/Notification';

const notificationData = [
  {
    notification_id: 'notif_001',
    user_id: 'user_adopter_001',
    title: 'Application Received',
    message:
      'Thank you for your application for Buddy! We have received it and will review it within 2-3 business days.',
    type: 'application_status',
    channel: 'in_app',
    read: false,
    action_url: '/applications/app_buddy_john_001',
    metadata: {
      application_id: 'app_buddy_john_001',
      pet_name: 'Buddy',
      rescue_name: 'Paws Rescue Austin',
    },
    created_at: new Date('2024-02-15T10:35:00Z'),
    updated_at: new Date('2024-02-15T10:35:00Z'),
  },
  {
    notification_id: 'notif_002',
    user_id: 'user_adopter_002',
    title: 'Application Approved! 🎉',
    message:
      'Congratulations! Your application for Whiskers has been approved. Please contact us to schedule a meet and greet.',
    type: 'adoption_approved',
    channel: 'in_app',
    read: true,
    action_url: '/applications/app_whiskers_emily_001',
    metadata: {
      application_id: 'app_whiskers_emily_001',
      pet_name: 'Whiskers',
      rescue_name: 'Furry Friends Portland',
    },
    created_at: new Date('2024-02-20T14:50:00Z'),
    updated_at: new Date('2024-02-20T16:30:00Z'),
  },
  {
    notification_id: 'notif_003',
    user_id: 'user_adopter_003',
    title: 'Interview Scheduled',
    message:
      'Your phone interview for Rocky has been scheduled. We will contact you this week to discuss the next steps.',
    type: 'interview_scheduled',
    channel: 'in_app',
    read: false,
    action_url: '/applications/app_rocky_michael_001',
    metadata: {
      application_id: 'app_rocky_michael_001',
      pet_name: 'Rocky',
      rescue_name: 'Happy Tails Senior Dog Rescue',
    },
    created_at: new Date('2024-02-18T09:20:00Z'),
    updated_at: new Date('2024-02-18T09:20:00Z'),
  },
  {
    notification_id: 'notif_004',
    user_id: 'user_adopter_004',
    title: 'Application Update',
    message:
      "Thank you for your interest in Luna. Unfortunately, we feel that a more experienced cat owner would be a better fit for Luna's high-energy needs. We encourage you to consider one of our calmer senior cats.",
    type: 'adoption_rejected',
    channel: 'in_app',
    read: false,
    action_url: '/applications/app_luna_jessica_001',
    metadata: {
      application_id: 'app_luna_jessica_001',
      pet_name: 'Luna',
      rescue_name: 'Paws Rescue Austin',
    },
    created_at: new Date('2024-02-19T11:35:00Z'),
    updated_at: new Date('2024-02-19T11:35:00Z'),
  },
  {
    notification_id: 'notif_005',
    user_id: 'user_rescue_staff_001',
    title: 'New Application Received',
    message:
      'A new application has been submitted for Buddy by John Smith. Please review at your earliest convenience.',
    type: 'application_status',
    channel: 'in_app',
    read: true,
    action_url: '/admin/applications/app_buddy_john_001',
    metadata: {
      application_id: 'app_buddy_john_001',
      pet_name: 'Buddy',
      applicant_name: 'John Smith',
    },
    created_at: new Date('2024-02-15T10:32:00Z'),
    updated_at: new Date('2024-02-15T11:00:00Z'),
  },
  {
    notification_id: 'notif_006',
    user_id: 'user_rescue_admin_002',
    title: 'Reference Check Complete',
    message:
      "All references for Michael Brown's application for Rocky have been verified successfully.",
    type: 'reference_request',
    channel: 'in_app',
    read: false,
    action_url: '/admin/applications/app_rocky_michael_001',
    metadata: {
      application_id: 'app_rocky_michael_001',
      pet_name: 'Rocky',
      applicant_name: 'Michael Brown',
    },
    created_at: new Date('2024-02-17T16:45:00Z'),
    updated_at: new Date('2024-02-17T16:45:00Z'),
  },
  {
    notification_id: 'notif_007',
    user_id: 'user_adopter_001',
    title: 'New Message from Paws Rescue Austin',
    message: "Sarah from Paws Rescue has sent you a message about Buddy's exercise needs.",
    type: 'message_received',
    channel: 'in_app',
    read: false,
    action_url: '/chat/chat_buddy_john_001',
    metadata: {
      chat_id: 'chat_buddy_john_001',
      sender_name: 'Sarah Johnson',
      rescue_name: 'Paws Rescue Austin',
    },
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

  console.log(`✅ Created ${notificationData.length} notifications`);
}
