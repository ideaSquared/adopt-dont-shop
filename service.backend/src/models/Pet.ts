// src/models/Pet.ts
import { DataTypes, Model, Op, Optional, QueryTypes, WhereOptions } from 'sequelize';
import sequelize, {
  getJsonType,
  getUuidType,
  getArrayType,
  getGeometryType,
  getTsVectorType,
  TsVector,
} from '../sequelize';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';

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
  ageGroup: AgeGroup;
  gender: Gender;
  status: PetStatus;
  type: PetType;
  breed?: string | null;
  secondaryBreed?: string | null;
  weightKg?: number | null;
  size: Size;
  color?: string | null;
  markings?: string | null;
  microchipId?: string | null;
  archived: boolean;
  featured: boolean;
  priorityListing: boolean;
  adoptionFee?: number | null;
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
  images: Array<{
    image_id: string;
    url: string;
    thumbnail_url?: string;
    caption?: string;
    is_primary: boolean;
    order_index: number;
    uploaded_at: Date;
  }>;
  videos: Array<{
    video_id: string;
    url: string;
    thumbnail_url?: string;
    caption?: string;
    duration_seconds?: number;
    uploaded_at: Date;
  }>;
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

export interface PetCreationAttributes
  extends Optional<
    PetAttributes,
    | 'petId'
    | 'archived'
    | 'featured'
    | 'priorityListing'
    | 'specialNeeds'
    | 'houseTrained'
    | 'videos'
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
  public ageGroup!: AgeGroup;
  public gender!: Gender;
  public status!: PetStatus;
  public type!: PetType;
  public breed!: string | null;
  public secondaryBreed!: string | null;
  public weightKg!: number | null;
  public size!: Size;
  public color!: string | null;
  public markings!: string | null;
  public microchipId!: string | null;
  public archived!: boolean;
  public featured!: boolean;
  public priorityListing!: boolean;
  public adoptionFee!: number | null;
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

  public getPrimaryImage(): string | null {
    const primaryImage = this.images?.find(img => img.is_primary);
    return primaryImage?.url || this.images?.[0]?.url || null;
  }

  public getAgeInMonths(): number | null {
    if (this.ageYears !== null && this.ageMonths !== null) {
      return this.ageYears * 12 + this.ageMonths;
    }
    if (this.ageYears !== null) {
      return this.ageYears * 12;
    }
    return this.ageMonths;
  }

  public getAgeDisplay(): string {
    if (this.ageYears && this.ageMonths) {
      return `${this.ageYears} years, ${this.ageMonths} months`;
    }
    if (this.ageYears) {
      return this.ageYears === 1 ? '1 year' : `${this.ageYears} years`;
    }
    if (this.ageMonths) {
      return this.ageMonths === 1 ? '1 month' : `${this.ageMonths} months`;
    }
    return 'Age unknown';
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
    const whereClause: WhereOptions<PetAttributes> = { ...filters };

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
    breed: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    secondaryBreed: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'secondary_breed',
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
    adoptionFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'adoption_fee',
      validate: {
        min: 0,
        max: 10000,
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
    images: {
      type: getJsonType(),
      allowNull: false,
      validate: {
        isValidImages(value: unknown) {
          if (!Array.isArray(value)) {
            throw new Error('Images must be an array');
          }
          value.forEach((img, index) => {
            if (
              typeof img !== 'object' ||
              img === null ||
              !('image_id' in img) ||
              !('url' in img)
            ) {
              throw new Error(`Image at index ${index} must have image_id and url`);
            }
          });
        },
      },
    },
    videos: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: [],
    },
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
  },
  {
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
        // Auto-set availableSince when status changes to available
        if (pet.status === PetStatus.AVAILABLE && !pet.availableSince) {
          pet.availableSince = new Date();
        }

        // Auto-set adoptedDate when status changes to adopted
        if (pet.status === PetStatus.ADOPTED && !pet.adoptedDate) {
          pet.adoptedDate = new Date();
        }
      },
      beforeSave: async (pet: Pet) => {
        // Update search vector (PostgreSQL only)
        const dialect = sequelize.getDialect();

        if (
          dialect === 'postgres' &&
          (pet.changed('name') ||
            pet.changed('breed') ||
            pet.changed('shortDescription') ||
            pet.changed('longDescription'))
        ) {
          const searchText = [
            pet.name,
            pet.breed,
            pet.secondaryBreed,
            pet.shortDescription,
            pet.longDescription,
            pet.temperament?.join(' '),
          ]
            .filter(Boolean)
            .join(' ');

          if (searchText.trim()) {
            const [results] = await sequelize.query<{ vector: TsVector }>(
              "SELECT to_tsvector('english', ?) as vector",
              {
                replacements: [searchText],
                type: QueryTypes.SELECT,
              }
            );
            pet.searchVector = results.vector;
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
  }
);

export default Pet;
