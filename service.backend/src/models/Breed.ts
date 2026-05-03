import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';
import { PetType } from './Pet';

// Plan 2.4 — breeds as a lookup table. Pet.breed / Pet.secondaryBreed
// were free-form STRING columns; "Golden Retriever", "golden retriever",
// "Goldie", "golden ret." all coexisted, which broke breed filters,
// breed-popularity stats, and made canonicalisation impossible. This
// table is the catalogue of canonical breeds; pets reference rows by
// FK on breed_id / secondary_breed_id.
//
// Species mirrors the existing PetType union (dog | cat | rabbit | ...) so
// breeds can't be miscategorised across species. The (species, name)
// composite uniqueness lets the same name exist for different species
// (e.g. "Persian" cat vs the unrelated "Persian" rabbit) without
// collision.

interface BreedAttributes {
  breed_id: string;
  species: PetType;
  name: string;
  created_at?: Date;
  updated_at?: Date;
}

interface BreedCreationAttributes extends Optional<
  BreedAttributes,
  'breed_id' | 'created_at' | 'updated_at'
> {}

export class Breed
  extends Model<BreedAttributes, BreedCreationAttributes>
  implements BreedAttributes
{
  public breed_id!: string;
  public species!: PetType;
  public name!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Breed.init(
  {
    breed_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    species: {
      type: DataTypes.ENUM(...Object.values(PetType)),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 128] },
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'Breed',
    tableName: 'breeds',
    timestamps: true,
    // Reference table — opt out of the global paranoid default. A
    // soft-deleted breed leaves a deleted_at row behind that still
    // collides on the (species, name) unique index, breaking
    // findOrCreate after a test truncate. We never want to "softly
    // remove" a breed anyway: archive via a flag instead, or hard-
    // delete if it really is gone.
    paranoid: false,
    underscored: true,
    indexes: [
      // (species, name) unique — one canonical row per name per species.
      {
        fields: ['species', 'name'],
        name: 'breeds_species_name_unique',
        unique: true,
      },
      // Name-prefix lookups for the breed search filter (caller passes
      // a free-form string; the service resolves it to one or more
      // breed_ids before hitting pets).
      { fields: ['name'], name: 'breeds_name_idx' },
      ...auditIndexes('breeds'),
    ],
  })
);

export default Breed;
