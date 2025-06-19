import {
  Model,
  Table,
  Column,
  DataType,
  HasMany,
  HasOne,
  BeforeCreate,
  BeforeUpdate,
} from 'sequelize-typescript';
import bcrypt from 'bcrypt';

// User roles enum
export enum UserRole {
  USER = 'user',
  RESCUE = 'rescue',
  ADMIN = 'admin',
}

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true, // Soft deletes
})
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  firstName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  lastName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: [8, 100],
    },
  })
  password!: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    allowNull: false,
    defaultValue: UserRole.USER,
  })
  role!: UserRole;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  profileImage?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isEmailVerified!: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  verificationToken?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  verificationTokenExpiresAt?: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  resetPasswordToken?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  resetPasswordTokenExpiresAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastLoginAt?: Date;

  // Password hashing hooks
  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(instance: User) {
    if (instance.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      instance.password = await bcrypt.hash(instance.password, salt);
    }
  }

  // Method to check password
  async validatePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Implement relationships with other models here
  // @HasMany(() => Pet)
  // pets?: Pet[];

  // @HasMany(() => Application)
  // applications?: Application[];

  // @HasOne(() => RescueProfile)
  // rescueProfile?: RescueProfile;
}
