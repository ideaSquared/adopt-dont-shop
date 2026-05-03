import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { hashToken } from '../utils/secrets';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

interface InvitationAttributes {
  invitation_id: string;
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
  public invitation_id!: string;
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
      type: getUuidType(),
      defaultValue: () => generateUuidV7(),
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
      unique: true,
    },
    rescue_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: getUuidType(),
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    /**
     * The user who issued the invite. Nullable for system-issued invites
     * and SET NULL on user delete so the invite row survives the actor.
     * Plan 2.2: closing the FK gap that previously left this as a
     * free-form STRING.
     */
    invited_by: {
      type: getUuidType(),
      allowNull: true,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'SET NULL',
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
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'invitations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['token'],
        name: 'invitations_token_unique',
      },
      {
        fields: ['rescue_id'],
        name: 'invitations_rescue_id_idx',
      },
      {
        fields: ['user_id'],
        name: 'invitations_user_id_idx',
      },
      {
        fields: ['email'],
        name: 'invitations_email_idx',
      },
      {
        fields: ['invited_by'],
        name: 'invitations_invited_by_idx',
      },
      ...auditIndexes('invitations'),
    ],
    hooks: {
      beforeSave: (invitation: Invitation) => {
        // Invitation.token is 32 bytes of crypto.randomBytes. Store the
        // SHA-256 hash so a DB leak doesn't expose the raw invite links.
        // acceptInvitation looks tokens up via hashToken(input).
        if (invitation.changed('token') && invitation.token) {
          invitation.token = hashToken(invitation.token);
        }
      },
    },
  })
);

export default Invitation;
