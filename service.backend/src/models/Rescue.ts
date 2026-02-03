import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { generateReadableId, getReadableIdSqlLiteral } from '../utils/readable-id';

interface RescueAttributes {
  rescueId: string;
  readableId: string;
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
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RescueCreationAttributes
  extends Optional<
    RescueAttributes,
    | 'rescueId'
    | 'readableId'
    | 'verifiedAt'
    | 'verifiedBy'
    | 'deletedAt'
    | 'deletedBy'
    | 'createdAt'
    | 'updatedAt'
  > {}

class Rescue extends Model<RescueAttributes, RescueCreationAttributes> implements RescueAttributes {
  public rescueId!: string;
  public readableId!: string;
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
  public isDeleted!: boolean;
  public deletedAt?: Date;
  public deletedBy?: string;
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
      defaultValue: DataTypes.UUIDV4,
      field: 'rescue_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
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
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'United Kingdom', // Changed from 'US' to UK
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
      type: DataTypes.STRING,
      allowNull: true,
      field: 'verified_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    settings: {
      type: getJsonType(),
      allowNull: true,
      defaultValue: {},
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
    deletedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'deleted_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
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
    tableName: 'rescues',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    defaultScope: {
      where: {
        isDeleted: false,
      },
    },
    scopes: {
      withDeleted: {
        where: {},
      },
      deleted: {
        where: {
          isDeleted: true,
        },
      },
    },
  }
);

export default Rescue;
