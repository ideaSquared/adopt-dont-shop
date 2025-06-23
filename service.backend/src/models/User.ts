import { BelongsToManyAddAssociationMixin, DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { JsonObject } from '../types/common';

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
  rescueId?: string | null;
  privacySettings?: JsonObject;
  notificationPreferences?: JsonObject;
  termsAcceptedAt?: Date | null;
  privacyPolicyAcceptedAt?: Date | null;
  Roles?: Role[];
}

export interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    'userId' | 'status' | 'userType' | 'loginAttempts' | 'createdAt' | 'updatedAt' | 'deletedAt'
  > {}

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
  public rescueId!: string | null;
  public privacySettings!: JsonObject;
  public notificationPreferences!: JsonObject;
  public termsAcceptedAt!: Date | null;
  public privacyPolicyAcceptedAt!: Date | null;

  // Optional Roles property
  public Roles?: Role[];

  // Association methods
  public addRole!: BelongsToManyAddAssociationMixin<Role, number>;

  // Instance methods for security
  public isAccountLocked(): boolean {
    return this.lockedUntil ? new Date() < this.lockedUntil : false;
  }

  public getFullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  public isEmailVerified(): boolean {
    return this.emailVerified || false;
  }

  public canLogin(): boolean {
    return this.status === UserStatus.ACTIVE && this.emailVerified && !this.isAccountLocked();
  }

  public static associate(models: any) {
    this.belongsToMany(models.Role, { through: models.UserRole, foreignKey: 'userId' });
  }
}

User.init(
  {
    userId: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'user_id', // Explicit database field mapping
      defaultValue:
        process.env.NODE_ENV === 'test'
          ? () => 'user_' + Math.random().toString(36).substr(2, 12)
          : sequelize.literal(`'user_' || left(md5(random()::text), 12)`),
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
      type: DataTypes.STRING(255),
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
        len: [10, 20],
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
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      field: 'backup_codes',
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
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
    },
    rescueId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'rescue_id',
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
    },
    privacySettings: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'privacy_settings',
      defaultValue: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: true,
      },
    },
    notificationPreferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'notification_preferences',
      defaultValue: {
        email: true,
        push: true,
        sms: false,
        applicationUpdates: true,
        petMatches: true,
        rescueUpdates: true,
      },
    },
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
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['userType'],
      },
      {
        fields: ['rescueId'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  }
);

export default User;
