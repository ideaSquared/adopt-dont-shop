import {
  BelongsToManyAddAssociationMixin,
  DataTypes,
  Model,
  Optional,
} from 'sequelize'
import sequelize from '../sequelize'
import { Role, UserRole } from './'

interface UserAttributes {
  user_id: string
  first_name?: string
  last_name?: string
  email: string
  password: string
  email_verified?: boolean
  verification_token?: string | null
  reset_token?: string | null
  reset_token_expiration?: Date | null
  reset_token_force_flag?: boolean
  created_at?: Date
  updated_at?: Date
  country?: string
  city?: string
  location?: { type: string; coordinates: [number, number] }
}
export interface UserCreationAttributes
  extends Optional<UserAttributes, 'user_id'> {}

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public user_id!: string
  public first_name!: string
  public last_name!: string
  public email!: string
  public password!: string
  public email_verified!: boolean
  public verification_token!: string | null
  public reset_token!: string | null
  public reset_token_expiration!: Date | null
  public reset_token_force_flag!: boolean
  public created_at!: Date
  public updated_at!: Date
  public country!: string
  public city!: string
  public location!: { type: string; coordinates: [number, number] }

  // Association methods
  public addRole!: BelongsToManyAddAssociationMixin<Role, number>

  // Roles property to store the associated roles
  public Roles?: Role[]

  public static associate() {
    this.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id' })
  }
}

User.init(
  {
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'user_' || left(md5(random()::text), 12)`,
      ),
    },
    first_name: {
      type: DataTypes.TEXT,
    },
    last_name: {
      type: DataTypes.TEXT,
    },
    email: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
    },
    verification_token: {
      type: DataTypes.STRING(64),
    },
    reset_token: {
      type: DataTypes.STRING(64),
    },
    reset_token_expiration: {
      type: DataTypes.DATE,
    },
    reset_token_force_flag: {
      type: DataTypes.BOOLEAN,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    country: {
      type: DataTypes.STRING(255),
    },
    city: {
      type: DataTypes.STRING(255),
    },
    location: {
      type: DataTypes.JSON,
    },
  },
  {
    sequelize,
    tableName: 'users',
    defaultScope: {
      // Automatically exclude password in default queries
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] },
      },
    },
    timestamps: true,
  },
)

export default User
