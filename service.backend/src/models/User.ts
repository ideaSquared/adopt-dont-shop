import { BelongsToManyAddAssociationMixin, DataTypes, Model, Optional } from 'sequelize';
import sequelize, {
  getJsonType,
  getUuidType,
  getArrayType,
  getGeometryType,
  getCitextType,
} from '../sequelize';
import { hashPassword, verifyPassword } from '../utils/password';
import { encryptSecret, hashBackupCode, hashToken } from '../utils/secrets';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

// Forward declarations to avoid circular imports
interface Permission {
  permissionId: string;
  name: string;
  resource: string;
  action: string;
}

interface Role {
  roleId: string;
  name: string;
  description?: string;
  Permissions?: Permission[];
}

// User status enum for better type safety
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  DEACTIVATED = 'deactivated',
}

// User type enum
export enum UserType {
  ADOPTER = 'adopter',
  RESCUE_STAFF = 'rescue_staff',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

// Define the UserAttributes interface with enhanced fields
interface UserAttributes {
  userId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  emailVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpiresAt?: Date | null;
  resetToken?: string | null;
  resetTokenExpiration?: Date | null;
  resetTokenForceFlag?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  dateOfBirth?: Date | null;
  profileImageUrl?: string | null;
  bio?: string | null;
  status: UserStatus;
  userType: UserType;
  lastLoginAt?: Date | null;
  loginAttempts: number;
  lockedUntil?: Date | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  backupCodes?: string[] | null;
  timezone?: string | null;
  language?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  country?: string;
  city?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  location?: { type: string; coordinates: [number, number] };
  // rescueId is NOT a DB column — affiliation lives in staff_members
  // (rescueId, userId, isVerified). Auth middleware looks up the verified
  // StaffMember row once per request and attaches the result here, so
  // controllers can read req.user.rescueId without doing the join.
  rescueId?: string | null;
  // privacySettings moved to user_privacy_prefs (plan 5.6).
  // notificationPreferences moved to user_notification_prefs (plan 5.6).
  termsAcceptedAt?: Date | null;
  privacyPolicyAcceptedAt?: Date | null;
  applicationDefaults?: JsonObject | null;
  // applicationPreferences moved to user_application_prefs (plan 5.6).
  profileCompletionStatus?: JsonObject;
  // applicationTemplateVersion column removed (plan 5.5) — there was
  // no backing application_templates table, so the field tracked
  // nothing and was a known dead-end.
  Roles?: Role[];
}

/**
 * User Creation Attributes
 * Interface for creating new user records with optional fields
 */
export interface UserCreationAttributes extends Optional<
  UserAttributes,
  'userId' | 'status' | 'userType' | 'loginAttempts' | 'createdAt' | 'updatedAt' | 'deletedAt'
> {}

/**
 * User Model
 * Represents a user in the adopt-don't-shop platform.
 * Enhanced with Phase 1 application profile features including:
 * - Application defaults for form pre-population
 * - Application preferences for user behavior
 * - Profile completion tracking
 * - Template versioning for future compatibility
 */
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public userId!: string;
  public firstName!: string;
  public lastName!: string;
  public email!: string;
  public password!: string;
  public emailVerified!: boolean;
  public verificationToken!: string | null;
  public verificationTokenExpiresAt!: Date | null;
  public resetToken!: string | null;
  public resetTokenExpiration!: Date | null;
  public resetTokenForceFlag!: boolean;
  public phoneNumber!: string | null;
  public phoneVerified!: boolean;
  public dateOfBirth!: Date | null;
  public profileImageUrl!: string | null;
  public bio!: string | null;
  public status!: UserStatus;
  public userType!: UserType;
  public lastLoginAt!: Date | null;
  public loginAttempts!: number;
  public lockedUntil!: Date | null;
  public twoFactorEnabled!: boolean;
  public twoFactorSecret!: string | null;
  public backupCodes!: string[] | null;
  public timezone!: string | null;
  public language!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
  public country!: string;
  public city!: string;
  public addressLine1!: string | null;
  public addressLine2!: string | null;
  public postalCode!: string | null;
  public location!: { type: string; coordinates: [number, number] };
  // Populated by auth middleware from staff_members lookup; not a DB
  // column. Optional because not every request loads it (anonymous,
  // adopters, public endpoints).
  public rescueId?: string | null;
  public termsAcceptedAt!: Date | null;
  public privacyPolicyAcceptedAt!: Date | null;
  public applicationDefaults!: JsonObject | null;
  public profileCompletionStatus!: JsonObject;
  // applicationTemplateVersion removed (plan 5.5).

  // Optional Roles property
  public Roles?: Role[];

  // Association methods
  public addRole!: BelongsToManyAddAssociationMixin<Role, number>;

  /**
   * Check if the user account is currently locked due to failed login attempts
   * @returns True if account is locked, false otherwise
   */
  public isAccountLocked(): boolean {
    return this.lockedUntil ? new Date() < this.lockedUntil : false;
  }

  /**
   * Get the user's full name by combining first and last name
   * @returns Combined first and last name, trimmed of whitespace
   */
  public getFullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  public isEmailVerified(): boolean {
    return this.emailVerified || false;
  }

  // Password comparison method
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return verifyPassword(candidatePassword, this.password);
  }

  public canLogin(): boolean {
    return this.status === UserStatus.ACTIVE && this.emailVerified && !this.isAccountLocked();
  }
}

User.init(
  {
    userId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'user_id',
      defaultValue: () => generateUuidV7(),
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'first_name',
      validate: {
        len: [1, 100],
        notEmpty: false,
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'last_name',
      validate: {
        len: [1, 100],
        notEmpty: false,
      },
    },
    email: {
      type: getCitextType(),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
        len: [5, 255],
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [8, 255],
      },
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'email_verified',
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'verification_token',
    },
    verificationTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verification_token_expires_at',
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reset_token',
    },
    resetTokenExpiration: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reset_token_expiration',
    },
    resetTokenForceFlag: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'reset_token_force_flag',
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'phone_number',
      validate: {
        isNullOrValidLength(value: string | null) {
          if (value === null || value === undefined || value === '') {
            return;
          }
          if (value.length < 10 || value.length > 20) {
            throw new Error('Phone number must be between 10 and 20 characters');
          }
        },
      },
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'phone_verified',
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_of_birth',
      validate: {
        isDate: true,
        isBefore: new Date().toISOString(),
      },
    },
    profileImageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'profile_image_url',
      validate: {
        isUrl: true,
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000],
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(UserStatus)),
      allowNull: false,
      defaultValue: UserStatus.PENDING_VERIFICATION,
    },
    userType: {
      type: DataTypes.ENUM(...Object.values(UserType)),
      allowNull: false,
      defaultValue: UserType.ADOPTER,
      field: 'user_type',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at',
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'login_attempts',
      validate: {
        min: 0,
        max: 10,
      },
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_until',
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'two_factor_enabled',
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'two_factor_secret',
    },
    backupCodes: {
      type: getArrayType(DataTypes.STRING),
      allowNull: true,
      field: 'backup_codes',
      validate: {
        backupCodesLength(value: unknown) {
          if (!Array.isArray(value)) {
            return;
          }
          if (value.length > 10) {
            throw new Error('backup_codes: array must contain no more than 10 codes');
          }
          for (let i = 0; i < value.length; i++) {
            const code = value[i];
            if (typeof code !== 'string' || code.length < 8 || code.length > 16) {
              throw new Error(
                `backup_codes[${i}]: each code must be a string between 8 and 16 characters`
              );
            }
          }
        },
      },
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'UTC',
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'en',
      validate: {
        is: {
          args: /^[a-z]{2,3}(-[A-Z]{2})?$/,
          msg: 'Language must be a BCP 47 simple form (e.g. en, en-GB, pt-BR)',
        },
      },
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    addressLine1: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address_line_1',
    },
    addressLine2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address_line_2',
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code',
    },
    location: {
      type: getGeometryType('POINT'),
      allowNull: true,
    },
    // rescueId is intentionally not a DB column — see UserAttributes
    // comment. Sequelize won't persist it, but the model class exposes it
    // for the auth middleware to populate.
    // privacySettings moved to user_privacy_prefs (plan 5.6); notification
    // prefs to user_notification_prefs. Both auto-created via the
    // User.afterCreate hook below.
    termsAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'terms_accepted_at',
    },
    privacyPolicyAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'privacy_policy_accepted_at',
    },
    applicationDefaults: {
      type: getJsonType(),
      allowNull: true,
      field: 'application_defaults',
      defaultValue: null,
    },
    // applicationPreferences moved to user_application_prefs (plan 5.6).
    // Auto-created via the User.afterCreate hook below. applicationDefaults
    // (the rich profile snapshot) stays as JSONB — separate larger slice.
    profileCompletionStatus: {
      type: getJsonType(),
      allowNull: true,
      field: 'profile_completion_status',
      defaultValue: {
        basic_info: false,
        living_situation: false,
        pet_experience: false,
        references: false,
        overall_percentage: 0,
        last_updated: null,
      },
    },
    // applicationTemplateVersion column removed (plan 5.5) — orphan
    // field with no backing application_templates table.
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    underscored: true,
    scopes: {
      defaultScope: {
        attributes: {
          exclude: ['password', 'resetToken', 'verificationToken', 'twoFactorSecret'],
        },
      },
      withSecrets: {
        // Include all attributes (including sensitive ones like password)
      },
    },
    indexes: [
      {
        unique: true,
        fields: ['email'],
        name: 'users_email_unique',
      },
      {
        fields: ['status'],
      },
      {
        fields: ['user_type'],
      },
      {
        fields: ['created_at'],
      },
      // paranoid: true filters every find on `deleted_at IS NULL`. Without
      // this index Postgres can't use it to skip soft-deleted rows; the
      // alternative is a sequential scan on every user lookup (plan 4.4).
      {
        fields: ['deleted_at'],
        name: 'users_deleted_at_idx',
      },
      ...auditIndexes('users'),
    ],
    hooks: {
      // Normalize identifier fields before validation so uniqueness /
      // isEmail checks see the canonical form (trimmed). Case is now
      // handled at the column level via CITEXT (plan 5.5.7).
      beforeValidate: (user: User) => {
        if (user.email && typeof user.email === 'string') {
          user.email = user.email.trim();
        }
        if (user.phoneNumber && typeof user.phoneNumber === 'string') {
          // Light normalization only — strip surrounding whitespace and the
          // common visual separators. Full E.164 requires a phone library;
          // deferred to when we add libphonenumber-js.
          user.phoneNumber = user.phoneNumber.trim().replace(/[\s\-()]/g, '');
        }
      },
      beforeCreate: async (user: User) => {
        if (user.password) {
          user.password = await hashPassword(user.password);
        }
        await protectSecretsIfChanged(user);
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password') && user.password) {
          user.password = await hashPassword(user.password);
        }
        await protectSecretsIfChanged(user);
      },
      // Plan 5.6 — every user gets typed pref rows at creation time so
      // consumers can always assume they exist. Defaults are declared on
      // each prefs model. Awaited sequentially because SQLite (the test
      // dialect) can't run two queries concurrently within the same
      // transaction.
      afterCreate: async (user: User, options) => {
        const { default: UserNotificationPrefs } = await import('./UserNotificationPrefs');
        const { default: UserPrivacyPrefs } = await import('./UserPrivacyPrefs');
        const { default: UserApplicationPrefs } = await import('./UserApplicationPrefs');
        await UserNotificationPrefs.findOrCreate({
          where: { user_id: user.userId },
          defaults: { user_id: user.userId },
          transaction: options.transaction,
        });
        await UserPrivacyPrefs.findOrCreate({
          where: { user_id: user.userId },
          defaults: { user_id: user.userId },
          transaction: options.transaction,
        });
        await UserApplicationPrefs.findOrCreate({
          where: { user_id: user.userId },
          defaults: { user_id: user.userId },
          transaction: options.transaction,
        });
      },
    },
  })
);

/**
 * Hash/encrypt sensitive fields before they hit the DB. Called from both the
 * create and update hooks. Idempotent-by-change: each block only runs when
 * the field is dirty, so re-saving a user doesn't double-hash.
 *
 * Callers write the raw value (e.g. user.resetToken = crypto.randomBytes(32)
 * .toString('hex')); the hook replaces it with the stored form before insert.
 * On read, the stored form is what comes back — lookups against these fields
 * must go through hashToken() first.
 */
async function protectSecretsIfChanged(user: User): Promise<void> {
  if (user.changed('verificationToken') && user.verificationToken) {
    user.verificationToken = hashToken(user.verificationToken);
  }
  if (user.changed('resetToken') && user.resetToken) {
    user.resetToken = hashToken(user.resetToken);
  }
  if (user.changed('twoFactorSecret') && user.twoFactorSecret) {
    user.twoFactorSecret = encryptSecret(user.twoFactorSecret);
  }
  if (user.changed('backupCodes') && user.backupCodes && user.backupCodes.length > 0) {
    // Skip values that already look like bcrypt hashes (start with $2). This
    // prevents double-hashing if the codes array is re-saved after load.
    user.backupCodes = await Promise.all(
      user.backupCodes.map(code => (code.startsWith('$2') ? code : hashBackupCode(code)))
    );
  }
}

export default User;
