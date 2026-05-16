// src/models/Pet.ts
import { DataTypes, Model, Op, Optional, QueryTypes, WhereAttributeHash } from 'sequelize';
import sequelize, {
  getUuidType,
  getArrayType,
  getGeometryType,
  getTsVectorType,
  TsVector,
} from '../sequelize';
import { type Money, money } from '@adopt-dont-shop/lib.types';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';
import { installGeneratedSearchVector } from './generated-search-vector';

// Pet status enum
export enum PetStatus {
  AVAILABLE = 'available',
  PENDING = 'pending',
  ADOPTED = 'adopted',
  FOSTER = 'foster',
  MEDICAL_HOLD = 'medical_hold',
  BEHAVIORAL_HOLD = 'behavioral_hold',
  NOT_AVAILABLE = 'not_available',
  DECEASED = 'deceased',
}

// Pet type enum
export enum PetType {
  DOG = 'dog',
  CAT = 'cat',
  RABBIT = 'rabbit',
  BIRD = 'bird',
  REPTILE = 'reptile',
  SMALL_MAMMAL = 'small_mammal',
  FISH = 'fish',
  OTHER = 'other',
}

// Gender enum
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

// Size enum
export enum Size {
  EXTRA_SMALL = 'extra_small',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large',
}

// Age group enum
export enum AgeGroup {
  BABY = 'baby',
  YOUNG = 'young',
  ADULT = 'adult',
  SENIOR = 'senior',
}

// Energy level enum
export enum EnergyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

// Vaccination status enum
export enum VaccinationStatus {
  UP_TO_DATE = 'up_to_date',
  PARTIAL = 'partial',
  NOT_VACCINATED = 'not_vaccinated',
  UNKNOWN = 'unknown',
}

// Spay/Neuter status enum
export enum SpayNeuterStatus {
  SPAYED = 'spayed',
  NEUTERED = 'neutered',
  NOT_ALTERED = 'not_altered',
  UNKNOWN = 'unknown',
}

// Good with categories enum
export enum GoodWith {
  CHILDREN = 'children',
  DOGS = 'dogs',
  CATS = 'cats',
  SMALL_ANIMALS = 'small_animals',
}

export interface PetAttributes {
  petId: string;
  name: string;
  rescueId: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  /**
   * Optional date of birth — preferred over ageYears/ageMonths when set,
   * since age computed from a fixed date doesn't drift over time. Many
   * rescues only have an estimate, in which case isBirthDateEstimate
   * records that the value is approximate.
   */
  birthDate?: Date | null;
  isBirthDateEstimate?: boolean;
  ageGroup: AgeGroup;
  gender: Gender;
  status: PetStatus;
  type: PetType;
  // Plan 2.4 — breeds extracted into the breeds lookup table. Both FKs
  // are nullable: an unknown-breed pet is a real case (stray of mixed
  // ancestry, etc.) and a single-breed pet has no secondary FK. Read
  // the human-readable breed name through the Breed / SecondaryBreed
  // associations.
  breedId?: string | null;
  secondaryBreedId?: string | null;
  weightKg?: number | null;
  size: Size;
  color?: string | null;
  markings?: string | null;
  microchipId?: string | null;
  archived: boolean;
  featured: boolean;
  priorityListing: boolean;
  /**
   * Adoption fee in minor units (e.g. pence for GBP, cents for USD).
   * Integer-only — avoids the float rounding surprises and currency
   * ambiguity of `DECIMAL(10,2)`. Pair with `adoptionFeeCurrency` to
   * interpret. (plan 3.2 / 5.5.8)
   */
  adoptionFeeMinor?: number | null;
  /** ISO 4217 currency code (3 uppercase letters). */
  adoptionFeeCurrency?: string | null;
  specialNeeds: boolean;
  specialNeedsDescription?: string | null;
  houseTrained: boolean;
  goodWithChildren?: boolean | null;
  goodWithDogs?: boolean | null;
  goodWithCats?: boolean | null;
  goodWithSmallAnimals?: boolean | null;
  energyLevel: EnergyLevel;
  exerciseNeeds?: string | null;
  groomingNeeds?: string | null;
  trainingNotes?: string | null;
  temperament?: string[] | null;
  medicalNotes?: string | null;
  behavioralNotes?: string | null;
  surrenderReason?: string | null;
  intakeDate?: Date | null;
  vaccinationStatus: VaccinationStatus;
  vaccinationDate?: Date | null;
  spayNeuterStatus: SpayNeuterStatus;
  spayNeuterDate?: Date | null;
  lastVetCheckup?: Date | null;
  // images / videos moved to the pet_media table (plan 2.1) — Pet.hasMany(PetMedia).
  location?: { type: string; coordinates: [number, number] };
  availableSince?: Date | null;
  adoptedDate?: Date | null;
  fosterStartDate?: Date | null;
  fosterEndDate?: Date | null;
  viewCount: number;
  favoriteCount: number;
  applicationCount: number;
  searchVector?: TsVector;
  tags?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface PetCreationAttributes extends Optional<
  PetAttributes,
  | 'petId'
  | 'archived'
  | 'featured'
  | 'priorityListing'
  | 'specialNeeds'
  | 'houseTrained'
  | 'viewCount'
  | 'favoriteCount'
  | 'applicationCount'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
> {}

class Pet extends Model<PetAttributes, PetCreationAttributes> implements PetAttributes {
  public petId!: string;
  public name!: string;
  public rescueId!: string;
  public shortDescription!: string | null;
  public longDescription!: string | null;
  public ageYears!: number | null;
  public ageMonths!: number | null;
  public birthDate!: Date | null;
  public isBirthDateEstimate!: boolean;
  public ageGroup!: AgeGroup;
  public gender!: Gender;
  public status!: PetStatus;
  public type!: PetType;
  public breedId!: string | null;
  public secondaryBreedId!: string | null;
  public weightKg!: number | null;
  public size!: Size;
  public color!: string | null;
  public markings!: string | null;
  public microchipId!: string | null;
  public archived!: boolean;
  public featured!: boolean;
  public priorityListing!: boolean;
  public adoptionFeeMinor!: number | null;
  public adoptionFeeCurrency!: string | null;
  public specialNeeds!: boolean;
  public specialNeedsDescription!: string | null;
  public houseTrained!: boolean;
  public goodWithChildren!: boolean | null;
  public goodWithDogs!: boolean | null;
  public goodWithCats!: boolean | null;
  public goodWithSmallAnimals!: boolean | null;
  public energyLevel!: EnergyLevel;
  public exerciseNeeds!: string | null;
  public groomingNeeds!: string | null;
  public trainingNotes!: string | null;
  public temperament!: string[] | null;
  public medicalNotes!: string | null;
  public behavioralNotes!: string | null;
  public surrenderReason!: string | null;
  public intakeDate!: Date | null;
  public vaccinationStatus!: VaccinationStatus;
  public vaccinationDate!: Date | null;
  public spayNeuterStatus!: SpayNeuterStatus;
  public spayNeuterDate!: Date | null;
  public lastVetCheckup!: Date | null;
  // images / videos moved to pet_media (plan 2.1).
  public location!: { type: string; coordinates: [number, number] };
  public availableSince!: Date | null;
  public adoptedDate!: Date | null;
  public fosterStartDate!: Date | null;
  public fosterEndDate!: Date | null;
  public viewCount!: number;
  public favoriteCount!: number;
  public applicationCount!: number;
  public searchVector!: TsVector;
  public tags!: string[] | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;

  // Instance methods
  public isAvailable(): boolean {
    return this.status === PetStatus.AVAILABLE && !this.archived;
  }

  public isAdopted(): boolean {
    return this.status === PetStatus.ADOPTED;
  }

  public getAgeInMonths(now: Date = new Date()): number | null {
    // Prefer birthDate when set — age computed from a fixed date doesn't
    // drift over time. Falls back to the legacy ageYears/ageMonths fields
    // for rescues that haven't backfilled birthDate yet.
    //
    // DATEONLY columns surface as 'YYYY-MM-DD' strings on Postgres and
    // sometimes as Date on SQLite; normalize either form to Date here.
    if (this.birthDate) {
      const birth =
        this.birthDate instanceof Date ? this.birthDate : new Date(this.birthDate as string);
      const months =
        (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth()) -
        (now.getDate() < birth.getDate() ? 1 : 0);
      return Math.max(0, months);
    }
    if (this.ageYears !== null && this.ageMonths !== null) {
      return this.ageYears * 12 + this.ageMonths;
    }
    if (this.ageYears !== null) {
      return this.ageYears * 12;
    }
    return this.ageMonths;
  }

  /**
   * Return the adoption fee as a Money value (integer minor units +
   * ISO 4217 currency). Returns null when no fee is recorded.
   */
  public getAdoptionFee(): Money | null {
    if (this.adoptionFeeMinor === null || this.adoptionFeeMinor === undefined) {
      return null;
    }
    return money(this.adoptionFeeMinor, this.adoptionFeeCurrency ?? 'GBP');
  }

  public getAgeDisplay(now: Date = new Date()): string {
    const totalMonths = this.getAgeInMonths(now);
    if (totalMonths === null) {
      return 'Age unknown';
    }
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const prefix = this.isBirthDateEstimate ? '~' : '';
    if (years > 0 && months > 0) {
      return `${prefix}${years} ${years === 1 ? 'year' : 'years'}, ${months} ${
        months === 1 ? 'month' : 'months'
      }`;
    }
    if (years > 0) {
      return `${prefix}${years} ${years === 1 ? 'year' : 'years'}`;
    }
    if (months > 0) {
      return `${prefix}${months} ${months === 1 ? 'month' : 'months'}`;
    }
    // Newborn / under one month
    return `${prefix}<1 month`;
  }

  public async incrementViewCount(): Promise<void> {
    // Atomic UPDATE pets SET view_count = view_count + 1 — avoids the
    // lost-update race when concurrent views land on the same pet.
    await this.increment('viewCount');
  }

  public canBeAdopted(): boolean {
    return [PetStatus.AVAILABLE, PetStatus.FOSTER].includes(this.status) && !this.archived;
  }

  // Static method for full-text search
  public static searchPets = async function (
    query: string,
    filters: JsonObject = {},
    limit = 50,
    offset = 0
  ): Promise<Pet[]> {
    const whereClause: WhereAttributeHash<PetAttributes> = {
      ...(filters as WhereAttributeHash<PetAttributes>),
    };

    if (query) {
      whereClause.searchVector = {
        [Op.match]: sequelize.fn('plainto_tsquery', 'english', query),
      };
    }

    return Pet.findAll({
      where: whereClause,
      limit,
      offset,
      order: query
        ? [
            [
              sequelize.fn(
                'ts_rank',
                sequelize.col('search_vector'),
                sequelize.fn('plainto_tsquery', 'english', query)
              ),
              'DESC',
            ],
            ['featured', 'DESC'],
            ['priorityListing', 'DESC'],
            ['createdAt', 'DESC'],
          ]
        : [
            ['featured', 'DESC'],
            ['priorityListing', 'DESC'],
            ['createdAt', 'DESC'],
          ],
    });
  };
}

Pet.init(
  {
    petId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'pet_id',
      defaultValue: () => generateUuidV7(),
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    rescueId: {
      type: getUuidType(),
      allowNull: false,
      field: 'rescue_id',
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
      onDelete: 'CASCADE',
    },
    shortDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'short_description',
      validate: {
        len: [0, 500],
      },
    },
    longDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'long_description',
      validate: {
        len: [0, 5000],
      },
    },
    ageYears: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'age_years',
      validate: {
        min: 0,
        max: 30,
      },
    },
    ageMonths: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'age_months',
      validate: {
        min: 0,
        max: 11,
      },
    },
    birthDate: {
      // DATEONLY: a calendar date with no time-of-day component. Pets
      // don't have a meaningful birth time, and storing one would imply
      // a precision the data doesn't have.
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'birth_date',
      validate: {
        isDate: true,
        isNotInFuture(value: string | null) {
          if (value && new Date(value) > new Date()) {
            throw new Error('Birth date cannot be in the future');
          }
        },
      },
    },
    isBirthDateEstimate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_birth_date_estimate',
      defaultValue: false,
    },
    ageGroup: {
      type: DataTypes.ENUM(...Object.values(AgeGroup)),
      allowNull: false,
      field: 'age_group',
      defaultValue: AgeGroup.ADULT,
    },
    gender: {
      type: DataTypes.ENUM(...Object.values(Gender)),
      allowNull: false,
      defaultValue: Gender.UNKNOWN,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PetStatus)),
      allowNull: false,
      defaultValue: PetStatus.AVAILABLE,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(PetType)),
      allowNull: false,
    },
    breedId: {
      type: getUuidType(),
      allowNull: true,
      field: 'breed_id',
      references: { model: 'breeds', key: 'breed_id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    secondaryBreedId: {
      type: getUuidType(),
      allowNull: true,
      field: 'secondary_breed_id',
      references: { model: 'breeds', key: 'breed_id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    weightKg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'weight_kg',
      validate: {
        min: 0.1,
        max: 200,
      },
    },
    size: {
      type: DataTypes.ENUM(...Object.values(Size)),
      allowNull: false,
      defaultValue: Size.MEDIUM,
    },
    color: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    markings: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    microchipId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'microchip_id',
      unique: true,
    },
    archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    priorityListing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'priority_listing',
      defaultValue: false,
    },
    /**
     * Minor units (pence/cents/etc.) — integer, no float rounding,
     * paired with adoptionFeeCurrency. (plan 3.2 / 5.5.8)
     */
    adoptionFeeMinor: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'adoption_fee_minor',
      validate: {
        min: 0,
        // 1,000,000 minor units (e.g. £10,000 / $10,000).
        max: 1_000_000,
      },
    },
    /**
     * ISO 4217 alpha-3 currency code. CHAR(3); enforced uppercase by
     * the column-level validator below. Default GBP since this is the
     * primary market today.
     */
    adoptionFeeCurrency: {
      type: DataTypes.CHAR(3),
      allowNull: true,
      field: 'adoption_fee_currency',
      defaultValue: 'GBP',
      validate: {
        is: {
          args: /^[A-Z]{3}$/,
          msg: 'Currency must be an ISO 4217 alpha-3 code (e.g. GBP, USD)',
        },
      },
    },
    specialNeeds: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'special_needs',
      defaultValue: false,
    },
    specialNeedsDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'special_needs_description',
    },
    houseTrained: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'house_trained',
      defaultValue: false,
    },
    goodWithChildren: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'good_with_children',
    },
    goodWithDogs: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'good_with_dogs',
    },
    goodWithCats: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'good_with_cats',
    },
    goodWithSmallAnimals: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'good_with_small_animals',
    },
    energyLevel: {
      type: DataTypes.ENUM(...Object.values(EnergyLevel)),
      allowNull: false,
      field: 'energy_level',
      defaultValue: EnergyLevel.MEDIUM,
    },
    exerciseNeeds: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'exercise_needs',
    },
    groomingNeeds: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'grooming_needs',
    },
    trainingNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'training_notes',
    },
    temperament: {
      type: getArrayType(DataTypes.STRING),
      allowNull: true,
    },
    medicalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'medical_notes',
    },
    behavioralNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'behavioral_notes',
    },
    surrenderReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'surrender_reason',
    },
    intakeDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'intake_date',
    },
    vaccinationStatus: {
      type: DataTypes.ENUM(...Object.values(VaccinationStatus)),
      allowNull: false,
      field: 'vaccination_status',
      defaultValue: VaccinationStatus.UNKNOWN,
    },
    vaccinationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'vaccination_date',
    },
    spayNeuterStatus: {
      type: DataTypes.ENUM(...Object.values(SpayNeuterStatus)),
      allowNull: false,
      field: 'spay_neuter_status',
      defaultValue: SpayNeuterStatus.UNKNOWN,
    },
    spayNeuterDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'spay_neuter_date',
    },
    lastVetCheckup: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_vet_checkup',
    },
    // images / videos moved to pet_media (plan 2.1).
    location: {
      type: getGeometryType('POINT'),
      allowNull: true,
    },
    availableSince: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'available_since',
    },
    adoptedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'adopted_date',
    },
    fosterStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'foster_start_date',
    },
    fosterEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'foster_end_date',
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'view_count',
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    favoriteCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'favorite_count',
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    applicationCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'application_count',
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    searchVector: {
      type: getTsVectorType(),
      allowNull: true,
      field: 'search_vector',
      // No-op setter: Postgres owns this column (GENERATED ALWAYS AS ...
      // STORED — see installGeneratedSearchVector below). Without the
      // override Sequelize would include search_vector in INSERTs and
      // Postgres would reject writes to a generated column. SQLite tests
      // also benefit — the column stays empty, search isn't tested there.
      set() {
        // intentionally empty
      },
    },
    tags: {
      type: getArrayType(DataTypes.STRING),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'pets',
    modelName: 'Pet',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['rescue_id'],
        name: 'pets_rescue_id_idx',
      },
      {
        fields: ['status'],
        name: 'pets_status_idx',
      },
      {
        fields: ['type'],
        name: 'pets_type_idx',
      },
      {
        fields: ['size'],
        name: 'pets_size_idx',
      },
      {
        fields: ['age_group'],
        name: 'pets_age_group_idx',
      },
      {
        fields: ['gender'],
        name: 'pets_gender_idx',
      },
      {
        fields: ['breed_id'],
        name: 'pets_breed_id_idx',
      },
      {
        fields: ['secondary_breed_id'],
        name: 'pets_secondary_breed_id_idx',
      },
      {
        fields: ['featured'],
        name: 'pets_featured_idx',
      },
      {
        fields: ['priority_listing'],
        name: 'pets_priority_idx',
      },
      {
        fields: ['created_at'],
        name: 'pets_created_at_idx',
      },
      {
        fields: ['available_since'],
        name: 'pets_available_since_idx',
      },
      {
        fields: ['microchip_id'],
        unique: true,
        name: 'pets_microchip_unique',
        where: {
          microchip_id: { [Op.ne]: null },
        },
      },
      {
        fields: ['search_vector'],
        using: 'gin',
        name: 'pets_search_vector_gin_idx',
      },
      {
        fields: ['location'],
        using: 'gist',
        name: 'pets_location_gist_idx',
      },
      // Composite indexes for the dominant access patterns (plan 4.4).
      // Single-column indexes on status/type/size remain useful for the
      // less common one-axis filters; these add covering shape for the
      // queries we know are hot.
      {
        fields: ['status', 'rescue_id'],
        name: 'pets_status_rescue_idx',
      },
      {
        fields: ['status', 'type', 'size'],
        name: 'pets_status_type_size_idx',
      },
      { fields: ['deleted_at'], name: 'pets_deleted_at_idx' },
      ...auditIndexes('pets'),
    ],
    hooks: {
      beforeValidate: (pet: Pet) => {
        // Auto-set availableSince when status changes to available
        if (pet.status === PetStatus.AVAILABLE && !pet.availableSince) {
          pet.availableSince = new Date();
        }

        // Auto-set adoptedDate when status changes to adopted
        if (pet.status === PetStatus.ADOPTED && !pet.adoptedDate) {
          pet.adoptedDate = new Date();
        }
      },
      // search_vector is now a stored generated column on Postgres
      // (installGeneratedSearchVector below). The hook that used to
      // recompute it on every save has been removed — Postgres maintains
      // the column from name/breed/shortDescription/longDescription/
      // secondaryBreed/temperament directly.
    },
    scopes: {
      available: {
        where: {
          status: PetStatus.AVAILABLE,
          archived: false,
        },
      },
      featured: {
        where: {
          featured: true,
          archived: false,
        },
      },
      adopted: {
        where: {
          status: PetStatus.ADOPTED,
        },
      },
      specialNeeds: {
        where: {
          specialNeeds: true,
        },
      },
      byType: (type: PetType) => ({
        where: { type },
      }),
      bySize: (size: Size) => ({
        where: { size },
      }),
      byAge: (ageGroup: AgeGroup) => ({
        where: { ageGroup },
      }),
      goodWithChildren: {
        where: {
          goodWithChildren: true,
        },
      },
      goodWithDogs: {
        where: {
          goodWithDogs: true,
        },
      },
      goodWithCats: {
        where: {
          goodWithCats: true,
        },
      },
    },
  })
);

// Install a Postgres trigger that maintains search_vector from row content
// so the DB owns the value and there's no JS hook to forget. Weight
// reflects search intent: name > breed > description > temperament.
//
// Plan 2.4 — breed strings now live in the breeds lookup table. The
// trigger looks them up via subquery so search by breed name still
// works; the cost is a per-row lookup against breeds (small reference
// table, indexed by PK), in exchange for the canonical-breeds win.
installGeneratedSearchVector(Pet, {
  table: 'pets',
  indexName: 'pets_search_vector_gin_idx',
  expression: [
    "setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A')",
    "setweight(to_tsvector('english', coalesce((SELECT name FROM breeds WHERE breed_id = NEW.breed_id), '')), 'B')",
    "setweight(to_tsvector('english', coalesce((SELECT name FROM breeds WHERE breed_id = NEW.secondary_breed_id), '')), 'B')",
    "setweight(to_tsvector('english', coalesce(NEW.short_description, '')), 'C')",
    "setweight(to_tsvector('english', coalesce(NEW.long_description, '')), 'C')",
    "setweight(to_tsvector('english', coalesce(array_to_string(NEW.temperament, ' '), '')), 'D')",
  ].join(' || '),
});

export default Pet;
