import { describe, it, expect } from 'vitest';
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  RelatedEntityType,
  getNotificationTypeLabel,
  getPriorityLabel,
  getPriorityColor,
} from './notifications';

describe('notification enums', () => {
  it('maps notification types to their wire values', () => {
    expect(NotificationType.APPLICATION_STATUS).toBe('application_status');
    expect(NotificationType.MESSAGE_RECEIVED).toBe('message_received');
    expect(NotificationType.USER_SANCTIONED).toBe('user_sanctioned');
  });

  it('exposes the four delivery channels', () => {
    expect(Object.values(NotificationChannel)).toEqual(['in_app', 'email', 'push', 'sms']);
  });

  it('exposes priority levels and related entity types', () => {
    expect(Object.values(NotificationPriority)).toEqual(['low', 'normal', 'high', 'urgent']);
    expect(RelatedEntityType.APPLICATION).toBe('application');
    expect(RelatedEntityType.SECURITY).toBe('security');
  });
});

describe('getNotificationTypeLabel', () => {
  it('returns a human-readable label for a known type', () => {
    expect(getNotificationTypeLabel(NotificationType.APPLICATION_STATUS)).toBe(
      'Application Status'
    );
    expect(getNotificationTypeLabel(NotificationType.MESSAGE_RECEIVED)).toBe('Messages');
  });

  it('returns a non-empty label for every notification type', () => {
    for (const type of Object.values(NotificationType)) {
      expect(getNotificationTypeLabel(type)).toBeTruthy();
    }
  });

  it('falls back to the raw value for an unknown type', () => {
    expect(getNotificationTypeLabel('not_a_real_type')).toBe('not_a_real_type');
  });
});

describe('getPriorityLabel', () => {
  it('returns the capitalised label for each priority', () => {
    expect(getPriorityLabel(NotificationPriority.LOW)).toBe('Low');
    expect(getPriorityLabel(NotificationPriority.NORMAL)).toBe('Normal');
    expect(getPriorityLabel(NotificationPriority.HIGH)).toBe('High');
    expect(getPriorityLabel(NotificationPriority.URGENT)).toBe('Urgent');
  });

  it('falls back to the raw value for an unknown priority', () => {
    expect(getPriorityLabel('whenever')).toBe('whenever');
  });
});

describe('getPriorityColor', () => {
  it('returns a distinct colour for each known priority', () => {
    expect(getPriorityColor(NotificationPriority.LOW)).toBe('#6B7280');
    expect(getPriorityColor(NotificationPriority.NORMAL)).toBe('#3B82F6');
    expect(getPriorityColor(NotificationPriority.HIGH)).toBe('#F59E0B');
    expect(getPriorityColor(NotificationPriority.URGENT)).toBe('#EF4444');
  });

  it('falls back to the neutral grey for an unknown priority', () => {
    expect(getPriorityColor('unknown')).toBe('#6B7280');
  });
});
