// src/models/StaffMember.ts
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface StaffMemberAttributes {
  staff_member_id: string
  user_id?: string
  verified_by_rescue?: boolean
  created_at?: Date
  updated_at?: Date
  rescue_id?: string
}

interface StaffMemberCreationAttributes
  extends Optional<StaffMemberAttributes, 'staff_member_id'> {}

class StaffMember
  extends Model<StaffMemberAttributes, StaffMemberCreationAttributes>
  implements StaffMemberAttributes
{
  public staff_member_id!: string
  public user_id!: string
  public verified_by_rescue!: boolean
  public created_at!: Date
  public updated_at!: Date
  public rescue_id!: string
}

StaffMember.init(
  {
    staff_member_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'staff_member_' || left(md5(random()::text), 12)`,
      ),
    },
    user_id: {
      type: DataTypes.STRING,
    },
    verified_by_rescue: {
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
    rescue_id: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
    tableName: 'staff_members',
    timestamps: false,
  },
)

export default StaffMember
