// Notification types - should match backend NotificationType enum
export enum NotificationType {
  APPLICATION_STATUS = 'application_status',
  MESSAGE_RECEIVED = 'message_received',
  PET_AVAILABLE = 'pet_available',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  HOME_VISIT_SCHEDULED = 'home_visit_scheduled',
  ADOPTION_APPROVED = 'adoption_approved',
  ADOPTION_REJECTED = 'adoption_rejected',
  REFERENCE_REQUEST = 'reference_request',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  ACCOUNT_SECURITY = 'account_security',
  REMINDER = 'reminder',
  MARKETING = 'marketing',
  RESCUE_INVITATION = 'rescue_invitation',
  STAFF_ASSIGNMENT = 'staff_assignment',
  PET_UPDATE = 'pet_update',
  FOLLOW_UP = 'follow_up',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
}

// Related entity types - should match backend validation
export enum RelatedEntityType {
  APPLICATION = 'application',
  PET = 'pet',
  MESSAGE = 'message',
  USER = 'user',
  RESCUE = 'rescue',
  CONVERSATION = 'conversation',
  INTERVIEW = 'interview',
  HOME_VISIT = 'home_visit',
  REMINDER = 'reminder',
  ANNOUNCEMENT = 'announcement',
  ADOPTION = 'adoption',
  EVENT = 'event',
  REFERENCE = 'reference',
  SECURITY = 'security',
}

// Helper function to get user-friendly notification type labels
export const getNotificationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    [NotificationType.APPLICATION_STATUS]: 'Application Status',
    [NotificationType.MESSAGE_RECEIVED]: 'Messages',
    [NotificationType.PET_AVAILABLE]: 'Pet Available',
    [NotificationType.INTERVIEW_SCHEDULED]: 'Interviews',
    [NotificationType.HOME_VISIT_SCHEDULED]: 'Home Visits',
    [NotificationType.ADOPTION_APPROVED]: 'Adoption Approved',
    [NotificationType.ADOPTION_REJECTED]: 'Adoption Rejected',
    [NotificationType.REFERENCE_REQUEST]: 'Reference Requests',
    [NotificationType.SYSTEM_ANNOUNCEMENT]: 'System Announcements',
    [NotificationType.ACCOUNT_SECURITY]: 'Security',
    [NotificationType.REMINDER]: 'Reminders',
    [NotificationType.MARKETING]: 'Marketing',
    [NotificationType.RESCUE_INVITATION]: 'Rescue Invitations',
    [NotificationType.STAFF_ASSIGNMENT]: 'Staff Assignments',
    [NotificationType.PET_UPDATE]: 'Pet Updates',
    [NotificationType.FOLLOW_UP]: 'Follow Ups',
  };

  return labels[type] || type;
};

// Helper function to get notification priority label
export const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    [NotificationPriority.LOW]: 'Low',
    [NotificationPriority.NORMAL]: 'Normal',
    [NotificationPriority.HIGH]: 'High',
    [NotificationPriority.URGENT]: 'Urgent',
  };

  return labels[priority] || priority;
};

// Helper function to get priority color
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case NotificationPriority.LOW:
      return '#6B7280'; // gray
    case NotificationPriority.NORMAL:
      return '#3B82F6'; // blue
    case NotificationPriority.HIGH:
      return '#F59E0B'; // amber
    case NotificationPriority.URGENT:
      return '#EF4444'; // red
    default:
      return '#6B7280';
  }
};
