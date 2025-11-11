import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType } from '../sequelize';
import { JsonObject } from '../types/common';

export enum EmailFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  NEVER = 'never',
}

export enum NotificationType {
  APPLICATION_UPDATES = 'application_updates',
  PET_ALERTS = 'pet_alerts',
  MESSAGES = 'messages',
  ADOPTION_CONFIRMATIONS = 'adoption_confirmations',
  RESCUE_NOTIFICATIONS = 'rescue_notifications',
  SYSTEM_ANNOUNCEMENTS = 'system_announcements',
  MARKETING = 'marketing',
  NEWSLETTER = 'newsletter',
  REMINDERS = 'reminders',
  DIGEST = 'digest',
  SECURITY_ALERTS = 'security_alerts',
}

interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
  frequency: EmailFrequency;
  channels: string[]; // ['email', 'push', 'sms']
  quietHours?: {
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
  keywords?: string[];
  filters?: JsonObject;
}

interface EmailPreferenceAttributes {
  preferenceId: string;
  userId: string;
  isEmailEnabled: boolean;
  globalUnsubscribe: boolean;
  preferences: NotificationPreference[];
  language: string;
  timezone: string;
  emailFormat: 'html' | 'text' | 'both';
  digestFrequency: EmailFrequency;
  digestTime: string; // HH:MM format
  unsubscribeToken: string;
  lastDigestSent?: Date;
  bounceCount: number;
  lastBounceAt?: Date;
  isBlacklisted: boolean;
  blacklistReason?: string;
  blacklistedAt?: Date;
  metadata?: JsonObject;
  createdAt: Date;
  updatedAt: Date;
}

interface EmailPreferenceCreationAttributes
  extends Optional<EmailPreferenceAttributes, 'preferenceId' | 'createdAt' | 'updatedAt'> {
  filters?: JsonObject;
  metadata?: JsonObject;
}

class EmailPreference
  extends Model<EmailPreferenceAttributes, EmailPreferenceCreationAttributes>
  implements EmailPreferenceAttributes
{
  public preferenceId!: string;
  public userId!: string;
  public isEmailEnabled!: boolean;
  public globalUnsubscribe!: boolean;
  public preferences!: NotificationPreference[];
  public language!: string;
  public timezone!: string;
  public emailFormat!: 'html' | 'text' | 'both';
  public digestFrequency!: EmailFrequency;
  public digestTime!: string;
  public unsubscribeToken!: string;
  public lastDigestSent?: Date;
  public bounceCount!: number;
  public lastBounceAt?: Date;
  public isBlacklisted!: boolean;
  public blacklistReason?: string;
  public blacklistedAt?: Date;
  public metadata?: JsonObject;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public canReceiveEmails(): boolean {
    return this.isEmailEnabled && !this.globalUnsubscribe && !this.isBlacklisted;
  }

  public canReceiveType(type: NotificationType): boolean {
    if (!this.canReceiveEmails()) {
      return false;
    }

    const preference = this.preferences.find(p => p.type === type);
    return preference ? preference.enabled && preference.frequency !== EmailFrequency.NEVER : false;
  }

  public getPreference(type: NotificationType): NotificationPreference | undefined {
    return this.preferences.find(p => p.type === type);
  }

  public setPreference(type: NotificationType, enabled: boolean, frequency?: EmailFrequency): void {
    const existingIndex = this.preferences.findIndex(p => p.type === type);

    const preference: NotificationPreference = {
      type,
      enabled,
      frequency: frequency || EmailFrequency.IMMEDIATE,
      channels: ['email'],
    };

    if (existingIndex >= 0) {
      this.preferences[existingIndex] = { ...this.preferences[existingIndex], ...preference };
    } else {
      this.preferences.push(preference);
    }
  }

  public enableType(
    type: NotificationType,
    frequency: EmailFrequency = EmailFrequency.IMMEDIATE
  ): void {
    this.setPreference(type, true, frequency);
  }

  public disableType(type: NotificationType): void {
    this.setPreference(type, false, EmailFrequency.NEVER);
  }

  public unsubscribeFromAll(): void {
    this.globalUnsubscribe = true;
    this.isEmailEnabled = false;
  }

  public unsubscribeFromType(type: NotificationType): void {
    this.disableType(type);
  }

  public recordBounce(): void {
    this.bounceCount += 1;
    this.lastBounceAt = new Date();

    // Auto-disable after too many bounces
    if (this.bounceCount >= 5) {
      this.isEmailEnabled = false;
      this.blacklist('Too many bounces');
    }
  }

  public blacklist(reason: string): void {
    this.isBlacklisted = true;
    this.blacklistReason = reason;
    this.blacklistedAt = new Date();
    this.isEmailEnabled = false;
  }

  public unblacklist(): void {
    this.isBlacklisted = false;
    this.blacklistReason = undefined;
    this.blacklistedAt = undefined;
  }

  public shouldReceiveDigest(): boolean {
    if (!this.canReceiveEmails()) {
      return false;
    }
    if (this.digestFrequency === EmailFrequency.NEVER) {
      return false;
    }

    const now = new Date();
    const lastSent = this.lastDigestSent;

    if (!lastSent) {
      return true;
    }

    const hoursSinceLastDigest = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

    switch (this.digestFrequency) {
      case EmailFrequency.IMMEDIATE:
        return false; // No digest for immediate
      case EmailFrequency.DAILY:
        return hoursSinceLastDigest >= 24;
      case EmailFrequency.WEEKLY:
        return hoursSinceLastDigest >= 168; // 7 days
      case EmailFrequency.MONTHLY:
        return hoursSinceLastDigest >= 720; // 30 days
      default:
        return false;
    }
  }

  public markDigestSent(): void {
    this.lastDigestSent = new Date();
  }

  public isInQuietHours(type: NotificationType): boolean {
    const preference = this.getPreference(type);
    if (!preference?.quietHours) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: preference.quietHours.timezone,
    });

    const { start, end } = preference.quietHours;

    // Handle overnight quiet hours (e.g., 22:00 to 06:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  public getEnabledTypes(): NotificationType[] {
    return this.preferences
      .filter(p => p.enabled && p.frequency !== EmailFrequency.NEVER)
      .map(p => p.type);
  }

  public getDisabledTypes(): NotificationType[] {
    return this.preferences
      .filter(p => !p.enabled || p.frequency === EmailFrequency.NEVER)
      .map(p => p.type);
  }

  public static generateUnsubscribeToken(): string {
    return `unsub_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  public static getDefaultPreferences(): NotificationPreference[] {
    return [
      {
        type: NotificationType.APPLICATION_UPDATES,
        enabled: true,
        frequency: EmailFrequency.IMMEDIATE,
        channels: ['email'],
      },
      {
        type: NotificationType.MESSAGES,
        enabled: true,
        frequency: EmailFrequency.IMMEDIATE,
        channels: ['email'],
      },
      {
        type: NotificationType.ADOPTION_CONFIRMATIONS,
        enabled: true,
        frequency: EmailFrequency.IMMEDIATE,
        channels: ['email'],
      },
      {
        type: NotificationType.SECURITY_ALERTS,
        enabled: true,
        frequency: EmailFrequency.IMMEDIATE,
        channels: ['email'],
      },
      {
        type: NotificationType.PET_ALERTS,
        enabled: true,
        frequency: EmailFrequency.DAILY,
        channels: ['email'],
      },
      {
        type: NotificationType.RESCUE_NOTIFICATIONS,
        enabled: true,
        frequency: EmailFrequency.IMMEDIATE,
        channels: ['email'],
      },
      {
        type: NotificationType.SYSTEM_ANNOUNCEMENTS,
        enabled: true,
        frequency: EmailFrequency.WEEKLY,
        channels: ['email'],
      },
      {
        type: NotificationType.REMINDERS,
        enabled: true,
        frequency: EmailFrequency.DAILY,
        channels: ['email'],
      },
      {
        type: NotificationType.DIGEST,
        enabled: false,
        frequency: EmailFrequency.WEEKLY,
        channels: ['email'],
      },
      {
        type: NotificationType.MARKETING,
        enabled: false,
        frequency: EmailFrequency.MONTHLY,
        channels: ['email'],
      },
      {
        type: NotificationType.NEWSLETTER,
        enabled: false,
        frequency: EmailFrequency.MONTHLY,
        channels: ['email'],
      },
    ];
  }
}

EmailPreference.init(
  {
    preferenceId: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'preference_id',
      defaultValue: () => `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    isEmailEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_email_enabled',
    },
    globalUnsubscribe: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'global_unsubscribe',
    },
    preferences: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: () => EmailPreference.getDefaultPreferences(),
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'en',
      validate: {
        isIn: [['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko']],
      },
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'UTC',
    },
    emailFormat: {
      type: DataTypes.ENUM('html', 'text', 'both'),
      allowNull: false,
      defaultValue: 'html',
      field: 'email_format',
    },
    digestFrequency: {
      type: DataTypes.ENUM(...Object.values(EmailFrequency)),
      allowNull: false,
      defaultValue: EmailFrequency.WEEKLY,
      field: 'digest_frequency',
    },
    digestTime: {
      type: DataTypes.STRING(5), // HH:MM format
      allowNull: false,
      defaultValue: '09:00',
      field: 'digest_time',
      validate: {
        is: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
    },
    unsubscribeToken: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'unsubscribe_token',
      defaultValue: () => EmailPreference.generateUnsubscribeToken(),
    },
    lastDigestSent: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_digest_sent',
    },
    bounceCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'bounce_count',
      validate: {
        min: 0,
      },
    },
    lastBounceAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_bounce_at',
    },
    isBlacklisted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_blacklisted',
    },
    blacklistReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'blacklist_reason',
    },
    blacklistedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'blacklisted_at',
    },
    metadata: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'email_preferences',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['user_id'],
        unique: true,
      },
      {
        fields: ['unsubscribe_token'],
        unique: true,
      },
      {
        fields: ['is_email_enabled'],
      },
      {
        fields: ['global_unsubscribe'],
      },
      {
        fields: ['is_blacklisted'],
      },
      {
        fields: ['digest_frequency'],
      },
      {
        fields: ['last_digest_sent'],
      },
    ],
  }
);

export default EmailPreference;
