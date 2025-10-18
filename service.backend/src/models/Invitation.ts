import { DataTypes, Model, Optional } from 'sequelize';
import { User } from '.';
import sequelize from '../sequelize';

interface InvitationAttributes {
  invitation_id: number;
  email: string;
  token: string;
  rescue_id: string;
  user_id?: string | null;
  title?: string | null;
  invited_by?: string | null;
  expiration: Date;
  created_at?: Date;
  updated_at?: Date;
  used?: boolean;
}

type InvitationCreationAttributes = Optional<
  InvitationAttributes,
  'invitation_id' | 'expiration' | 'used'
>;

class Invitation
  extends Model<InvitationAttributes, InvitationCreationAttributes>
  implements InvitationAttributes
{
  public invitation_id!: number;
  public email!: string;
  public token!: string;
  public rescue_id!: string;
  public user_id?: string | null;
  public title?: string | null;
  public invited_by?: string | null;
  public expiration!: Date;
  public created_at!: Date;
  public updated_at!: Date;
  public used!: boolean;
}

Invitation.init(
  {
    invitation_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rescue_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: User,
        key: 'user_id',
      },
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    invited_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expiration: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'invitations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Invitation;
