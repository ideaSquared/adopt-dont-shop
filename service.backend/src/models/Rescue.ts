import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType, getCitextType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

interface RescueAttributes {
  rescueId: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  county?: string; // UK: County (optional), was: state
  postcode: string; // UK: Postcode, was: zipCode
  country: string;
  website?: string;
  description?: string;
  mission?: string;
  ein?: string;
  registrationNumber?: string;
  contactPerson: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'pending' | 'verified' | 'suspended' | 'inactive';
  verifiedAt?: Date;
  verifiedBy?: string;
  settings?: object;
  /** Managed by Sequelize paranoid; null when the row is live. */
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RescueCreationAttributes
  extends Optional<
    RescueAttributes,
    'rescueId' | 'verifiedAt' | 'verifiedBy' | 'deletedAt' | 'createdAt' | 'updatedAt'
  > {}

class Rescue extends Model<RescueAttributes, RescueCreationAttributes> implements RescueAttributes {
  public rescueId!: string;
  public name!: string;
  public email!: string;
  public phone?: string;
  public address!: string;
  public city!: string;
  public county?: string; // UK: County (optional)
  public postcode!: string; // UK: Postcode
  public country!: string;
  public website?: string;
  public description?: string;
  public mission?: string;
  public ein?: string;
  public registrationNumber?: string;
  public contactPerson!: string;
  public contactTitle?: string;
  public contactEmail?: string;
  public contactPhone?: string;
  public status!: 'pending' | 'verified' | 'suspended' | 'inactive';
  public verifiedAt?: Date;
  public verifiedBy?: string;
  public settings?: object;
  public deletedAt?: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public staff?: any[]; // Sequelize association - will be StaffMember[] at runtime
}

// Initialize model
Rescue.init(
  {
    rescueId: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
      field: 'rescue_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: getCitextType(),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    county: {
      type: DataTypes.STRING,
      allowNull: true, // Optional for UK addresses
      field: 'state', // Maps to existing 'state' column in database
    },
    postcode: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'zip_code', // Maps to existing 'zip_code' column in database
    },
    /**
     * ISO 3166-1 alpha-2 country code (e.g. GB, US). CHAR(2),
     * uppercase. The plan (5.5.9) prefers stable codes over country
     * names for the obvious reason — names change, codes don't, and
     * a 2-letter constraint catches typos at the DB.
     */
    country: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      defaultValue: 'GB',
      validate: {
        is: {
          args: /^[A-Z]{2}$/,
          msg: 'Country must be an ISO 3166-1 alpha-2 code (e.g. GB, US)',
        },
      },
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mission: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ein: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Employer Identification Number',
    },
    registrationNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'registration_number',
    },
    contactPerson: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'contact_person',
    },
    contactTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'contact_title',
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'contact_email',
      validate: {
        isEmail: true,
      },
    },
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'contact_phone',
    },
    status: {
      type: DataTypes.ENUM('pending', 'verified', 'suspended', 'inactive'),
      allowNull: false,
      defaultValue: 'pending',
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at',
    },
    verifiedBy: {
      type: getUuidType(),
      allowNull: true,
      field: 'verified_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
    },
    settings: {
      type: getJsonType(),
      allowNull: true,
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
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'rescues',
    timestamps: true,
    underscored: true,
    // Soft-delete via Sequelize's paranoid mode (plan 3.5). `deletedAt`
    // is managed automatically; `Rescue.destroy()` soft-deletes,
    // `restore()` undeletes, and the default scope hides deleted rows.
    // `paranoid: true` removes the need for the old isDeleted /
    // deletedBy columns; the audit log captures who deleted.
    paranoid: true,
    indexes: [
      {
        fields: ['verified_by'],
        name: 'rescues_verified_by_idx',
      },
      { fields: ['deleted_at'], name: 'rescues_deleted_at_idx' },
      ...auditIndexes('rescues'),
    ],
    hooks: {
      // Plan 5.6 — every rescue gets a typed settings row at creation
      // time so consumers can always assume it exists.
      afterCreate: async (rescue: Rescue, options) => {
        const { default: RescueSettings } = await import('./RescueSettings');
        await RescueSettings.findOrCreate({
          where: { rescue_id: rescue.rescueId },
          defaults: { rescue_id: rescue.rescueId },
          transaction: options.transaction,
        });
      },
    },
  })
);

export default Rescue;
