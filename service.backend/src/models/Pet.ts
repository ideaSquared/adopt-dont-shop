// src/models/Pet.ts
import { DataTypes, Model, Op, Optional, QueryTypes, WhereOptions } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { JsonObject } from '../types/common';

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

// Sequelize TSVECTOR type representation
type TSVector = unknown;

export interface PetAttributes {
  pet_id: string;
  name: string;
  rescue_id: string;
  short_description?: string | null;
  long_description?: string | null;
  age_years?: number | null;
  age_months?: number | null;
  age_group: AgeGroup;
  gender: Gender;
  status: PetStatus;
  type: PetType;
  breed?: string | null;
  secondary_breed?: string | null;
  weight_kg?: number | null;
  size: Size;
  color?: string | null;
  markings?: string | null;
  microchip_id?: string | null;
  archived: boolean;
  featured: boolean;
  priority_listing: boolean;
  adoption_fee?: number | null;
  special_needs: boolean;
  special_needs_description?: string | null;
  house_trained: boolean;
  good_with_children?: boolean | null;
  good_with_dogs?: boolean | null;
  good_with_cats?: boolean | null;
  good_with_small_animals?: boolean | null;
  energy_level: EnergyLevel;
  exercise_needs?: string | null;
  grooming_needs?: string | null;
  training_notes?: string | null;
  temperament?: string[] | null;
  medical_notes?: string | null;
  behavioral_notes?: string | null;
  surrender_reason?: string | null;
  intake_date?: Date | null;
  vaccination_status: VaccinationStatus;
  vaccination_date?: Date | null;
  spay_neuter_status: SpayNeuterStatus;
  spay_neuter_date?: Date | null;
  last_vet_checkup?: Date | null;
  images: Array<{
    image_id: string;
    url: string;
    thumbnail_url?: string;
    caption?: string;
    is_primary: boolean;
    order_index: number;
    uploaded_at: Date;
  }>;
  videos?: Array<{
    video_id: string;
    url: string;
    thumbnail_url?: string;
    caption?: string;
    duration_seconds?: number;
    uploaded_at: Date;
  }>;
  location?: { type: string; coordinates: [number, number] };
  available_since?: Date | null;
  adopted_date?: Date | null;
  foster_start_date?: Date | null;
  foster_end_date?: Date | null;
  view_count: number;
  favorite_count: number;
  application_count: number;
  search_vector?: TSVector;
  tags?: string[] | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface PetCreationAttributes
  extends Optional<
    PetAttributes,
    | 'pet_id'
    | 'archived'
    | 'featured'
    | 'priority_listing'
    | 'special_needs'
    | 'house_trained'
    | 'view_count'
    | 'favorite_count'
    | 'application_count'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
  > {}

class Pet extends Model<PetAttributes, PetCreationAttributes> implements PetAttributes {
  public pet_id!: string;
  public name!: string;
  public rescue_id!: string;
  public short_description!: string | null;
  public long_description!: string | null;
  public age_years!: number | null;
  public age_months!: number | null;
  public age_group!: AgeGroup;
  public gender!: Gender;
  public status!: PetStatus;
  public type!: PetType;
  public breed!: string | null;
  public secondary_breed!: string | null;
  public weight_kg!: number | null;
  public size!: Size;
  public color!: string | null;
  public markings!: string | null;
  public microchip_id!: string | null;
  public archived!: boolean;
  public featured!: boolean;
  public priority_listing!: boolean;
  public adoption_fee!: number | null;
  public special_needs!: boolean;
  public special_needs_description!: string | null;
  public house_trained!: boolean;
  public good_with_children!: boolean | null;
  public good_with_dogs!: boolean | null;
  public good_with_cats!: boolean | null;
  public good_with_small_animals!: boolean | null;
  public energy_level!: EnergyLevel;
  public exercise_needs!: string | null;
  public grooming_needs!: string | null;
  public training_notes!: string | null;
  public temperament!: string[] | null;
  public medical_notes!: string | null;
  public behavioral_notes!: string | null;
  public surrender_reason!: string | null;
  public intake_date!: Date | null;
  public vaccination_status!: VaccinationStatus;
  public vaccination_date!: Date | null;
  public spay_neuter_status!: SpayNeuterStatus;
  public spay_neuter_date!: Date | null;
  public last_vet_checkup!: Date | null;
  public images!: Array<{
    image_id: string;
    url: string;
    thumbnail_url?: string;
    caption?: string;
    is_primary: boolean;
    order_index: number;
    uploaded_at: Date;
  }>;
  public videos!: Array<{
    video_id: string;
    url: string;
    thumbnail_url?: string;
    caption?: string;
    duration_seconds?: number;
    uploaded_at: Date;
  }>;
  public location!: { type: string; coordinates: [number, number] };
  public available_since!: Date | null;
  public adopted_date!: Date | null;
  public foster_start_date!: Date | null;
  public foster_end_date!: Date | null;
  public view_count!: number;
  public favorite_count!: number;
  public application_count!: number;
  public search_vector!: TSVector;
  public tags!: string[] | null;
  public created_at!: Date;
  public updated_at!: Date;
  public deleted_at!: Date | null;

  // Instance methods
  public isAvailable(): boolean {
    return this.status === PetStatus.AVAILABLE && !this.archived;
  }

  public isAdopted(): boolean {
    return this.status === PetStatus.ADOPTED;
  }

  public getPrimaryImage(): string | null {
    const primaryImage = this.images?.find(img => img.is_primary);
    return primaryImage?.url || this.images?.[0]?.url || null;
  }

  public getAgeInMonths(): number | null {
    if (this.age_years !== null && this.age_months !== null) {
      return this.age_years * 12 + this.age_months;
    }
    if (this.age_years !== null) {
      return this.age_years * 12;
    }
    return this.age_months;
  }

  public getAgeDisplay(): string {
    if (this.age_years && this.age_months) {
      return `${this.age_years} years, ${this.age_months} months`;
    }
    if (this.age_years) {
      return this.age_years === 1 ? '1 year' : `${this.age_years} years`;
    }
    if (this.age_months) {
      return this.age_months === 1 ? '1 month' : `${this.age_months} months`;
    }
    return 'Age unknown';
  }

  public incrementViewCount(): void {
    this.view_count += 1;
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
    const whereClause: WhereOptions<PetAttributes> = { ...filters };

    if (query) {
      whereClause.search_vector = {
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
            ['priority_listing', 'DESC'],
            ['created_at', 'DESC'],
          ]
        : [
            ['featured', 'DESC'],
            ['priority_listing', 'DESC'],
            ['created_at', 'DESC'],
          ],
    });
  };
}

Pet.init(
  {
    pet_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
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
    short_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    long_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000],
      },
    },
    age_years: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 30,
      },
    },
    age_months: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 11,
      },
    },
    age_group: {
      type: DataTypes.ENUM(...Object.values(AgeGroup)),
      allowNull: false,
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
    breed: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    secondary_breed: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    weight_kg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
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
    microchip_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
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
    priority_listing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    adoption_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 10000,
      },
    },
    special_needs: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    special_needs_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    house_trained: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    good_with_children: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    good_with_dogs: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    good_with_cats: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    good_with_small_animals: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    energy_level: {
      type: DataTypes.ENUM(...Object.values(EnergyLevel)),
      allowNull: false,
      defaultValue: EnergyLevel.MEDIUM,
    },
    exercise_needs: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    grooming_needs: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    training_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    temperament: {
      type: getArrayType(DataTypes.STRING),
      allowNull: true,
    },
    medical_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    behavioral_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    surrender_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    intake_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    vaccination_status: {
      type: DataTypes.ENUM(...Object.values(VaccinationStatus)),
      allowNull: false,
      defaultValue: VaccinationStatus.UNKNOWN,
    },
    vaccination_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    spay_neuter_status: {
      type: DataTypes.ENUM(...Object.values(SpayNeuterStatus)),
      allowNull: false,
      defaultValue: SpayNeuterStatus.UNKNOWN,
    },
    spay_neuter_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_vet_checkup: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    images: {
      type: getJsonType(),
      allowNull: false,
      validate: {
        isValidImages(value: unknown) {
          if (!Array.isArray(value)) {
            throw new Error('Images must be an array');
          }
          value.forEach((img, index) => {
            if (typeof img !== 'object' || img === null || !('image_id' in img) || !('url' in img)) {
              throw new Error(`Image at index ${index} must have image_id and url`);
            }
          });
        },
      },
    },
    videos: {
      type: getJsonType(),
      allowNull: false,
    },
    location: {
      type: getGeometryType('POINT'),
      allowNull: true,
    },
    available_since: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    adopted_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    foster_start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    foster_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    view_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    favorite_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    application_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    search_vector: {
      type: DataTypes.TSVECTOR,
      allowNull: true,
    },
    tags: {
      type: getArrayType(DataTypes.STRING),
      allowNull: true,
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'pets',
    modelName: 'Pet',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
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
        fields: ['breed'],
        name: 'pets_breed_idx',
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
    ],
    hooks: {
      beforeValidate: (pet: Pet) => {
        // Auto-set available_since when status changes to available
        if (pet.status === PetStatus.AVAILABLE && !pet.available_since) {
          pet.available_since = new Date();
        }

        // Auto-set adopted_date when status changes to adopted
        if (pet.status === PetStatus.ADOPTED && !pet.adopted_date) {
          pet.adopted_date = new Date();
        }
      },
      beforeSave: async (pet: Pet) => {
        // Update search vector (PostgreSQL only)
        const dialect = sequelize.getDialect();

        if (
          dialect === 'postgres' &&
          (pet.changed('name') ||
            pet.changed('breed') ||
            pet.changed('short_description') ||
            pet.changed('long_description'))
        ) {
          const searchText = [
            pet.name,
            pet.breed,
            pet.secondary_breed,
            pet.short_description,
            pet.long_description,
            pet.temperament?.join(' '),
          ]
            .filter(Boolean)
            .join(' ');

          if (searchText.trim()) {
            const [results] = await sequelize.query<{ vector: TSVector }>(
              "SELECT to_tsvector('english', ?) as vector",
              {
                replacements: [searchText],
                type: QueryTypes.SELECT,
              }
            );
            pet.search_vector = results.vector;
          }
        }
      },
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
          special_needs: true,
        },
      },
      byType: (type: PetType) => ({
        where: { type },
      }),
      bySize: (size: Size) => ({
        where: { size },
      }),
      byAge: (ageGroup: AgeGroup) => ({
        where: { age_group: ageGroup },
      }),
      goodWithChildren: {
        where: {
          good_with_children: true,
        },
      },
      goodWithDogs: {
        where: {
          good_with_dogs: true,
        },
      },
      goodWithCats: {
        where: {
          good_with_cats: true,
        },
      },
    },
  }
);

export default Pet;
