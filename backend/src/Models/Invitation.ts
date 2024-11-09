// src/models/Invitation.ts

import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface InvitationAttributes {
  invitation_id: number
  email: string
  token: string
  rescue_id: string // Foreign key to associate with the rescue
  expiration: Date
  created_at?: Date
  updated_at?: Date
  used?: boolean
}

// Optional fields for creation
type InvitationCreationAttributes = Optional<
  InvitationAttributes,
  'invitation_id' | 'expiration' | 'used'
>

class Invitation
  extends Model<InvitationAttributes, InvitationCreationAttributes>
  implements InvitationAttributes
{
  public invitation_id!: number
  public email!: string
  public token!: string
  public rescue_id!: string
  public expiration!: Date
  public created_at!: Date
  public updated_at!: Date
  public used!: boolean
}

// Initialize the model
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
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiration: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // Default to 48 hours from creation
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'invitations',
    timestamps: true,
  },
)

export default Invitation
