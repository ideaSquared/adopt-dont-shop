import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

// Plan 5.5.11 — addresses as a first-class entity. Both users and
// rescues today store their addresses inline as columns on the parent
// row. Users typically have multiple addresses over time (home →
// shipping for a home-visit → new home post-move) and rescues can
// have a head office plus regional intake locations, so the inline
// shape doesn't model the domain. This table is the destination for
// that migration; existing inline columns continue to work in
// parallel for now (the cutover is a separate slice).
//
// Polymorphic FK: the owner_type discriminator + owner_id pair points
// at either a user_id or a rescue_id. Both columns share the UUID
// shape, so a single owner_id column is sufficient. The plan's
// rationale: "polymorphic, acceptable here because the shape is
// identical" — the alternative (two nullable FKs) clutters the schema
// without adding query power. A trigger can enforce the parent
// existence at the DB level later; for now the application layer is
// responsible.

export enum AddressOwnerType {
  USER = 'user',
  RESCUE = 'rescue',
}

interface AddressAttributes {
  address_id: string;
  owner_type: AddressOwnerType;
  owner_id: string;
  // Optional human-readable label — "home", "mailing", "intake-london",
  // etc. Free-form so rescues can categorise as they please.
  label: string | null;
  line_1: string;
  line_2: string | null;
  city: string;
  // State / county / province — naming varies by country, so use the
  // generic "region" label. Optional because some addresses (UK
  // postcodes, city-states) don't have a meaningful region.
  region: string | null;
  postal_code: string;
  // ISO 3166-1 alpha-2 (plan 5.5.9). CHAR(2), uppercase.
  country: string;
  // Exactly one address per owner can be marked primary. Enforced via
  // a partial unique index below — `WHERE is_primary = true`.
  is_primary: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface AddressCreationAttributes extends Optional<
  AddressAttributes,
  'address_id' | 'label' | 'line_2' | 'region' | 'is_primary' | 'created_at' | 'updated_at'
> {}

export class Address
  extends Model<AddressAttributes, AddressCreationAttributes>
  implements AddressAttributes
{
  public address_id!: string;
  public owner_type!: AddressOwnerType;
  public owner_id!: string;
  public label!: string | null;
  public line_1!: string;
  public line_2!: string | null;
  public city!: string;
  public region!: string | null;
  public postal_code!: string;
  public country!: string;
  public is_primary!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Address.init(
  {
    address_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    owner_type: {
      type: DataTypes.ENUM(...Object.values(AddressOwnerType)),
      allowNull: false,
    },
    owner_id: {
      type: getUuidType(),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    line_1: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    line_2: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    region: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    postal_code: {
      type: DataTypes.STRING(32),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    country: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      validate: {
        // Plan 5.5.9 — ISO 3166-1 alpha-2, uppercase.
        is: /^[A-Z]{2}$/,
      },
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'Address',
    tableName: 'addresses',
    timestamps: true,
    underscored: true,
    indexes: [
      // Most reads load all addresses for a single owner (e.g. "show
      // all of this user's addresses"). Composite (owner_type,
      // owner_id) supports both polymorphic-resolution and per-owner
      // listings.
      {
        fields: ['owner_type', 'owner_id'],
        name: 'addresses_owner_idx',
      },
      // Exactly one primary per owner — partial unique index on
      // is_primary so non-primary rows don't conflict with each other.
      {
        fields: ['owner_type', 'owner_id'],
        name: 'addresses_one_primary_per_owner',
        unique: true,
        where: { is_primary: true },
      },
      // Country + postal_code lookups support "find rescues near this
      // postcode" queries that don't go through the geo-indexed
      // location column.
      {
        fields: ['country', 'postal_code'],
        name: 'addresses_country_postal_idx',
      },
      ...auditIndexes('addresses'),
    ],
    validate: {
      // Owner_id has the right shape for either user or rescue (same
      // UUID type), but enforce that one of the discriminators is
      // chosen — if the application layer ever forgets to set
      // owner_type the row would silently float. Belt + braces.
      ownerTypeIsKnown(this: Address) {
        if (!Object.values(AddressOwnerType).includes(this.owner_type)) {
          throw new Error(
            `addresses.owner_type must be one of: ${Object.values(AddressOwnerType).join(', ')}`
          );
        }
      },
    },
  })
);

export default Address;
