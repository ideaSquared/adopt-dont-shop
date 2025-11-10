import { DataTypes, Model, Optional, WhereOptions } from 'sequelize';
import sequelize from '../sequelize';

export enum RatingType {
  PET = 'pet',
  RESCUE = 'rescue',
  USER = 'user',
  APPLICATION = 'application',
  EXPERIENCE = 'experience',
}

export enum RatingCategory {
  OVERALL = 'overall',
  COMMUNICATION = 'communication',
  PROCESS = 'process',
  CARE = 'care',
  FOLLOW_UP = 'follow_up',
  VALUE = 'value',
  RECOMMENDATION = 'recommendation',
}

interface RatingAttributes {
  rating_id: string;
  reviewer_id: string; // User giving the rating
  reviewee_id?: string; // User being rated (for user ratings)
  pet_id?: string; // Pet being rated
  rescue_id?: string; // Rescue being rated
  application_id?: string; // Application being rated
  rating_type: RatingType;
  category: RatingCategory;
  score: number; // 1-5 rating
  title?: string; // Rating title/headline
  review_text?: string; // Detailed review text
  pros?: string[]; // Positive aspects
  cons?: string[]; // Negative aspects
  helpful_count: number; // Number of users who found this helpful
  reported_count: number; // Number of times this rating was reported
  is_verified: boolean; // Whether the reviewer actually used the service
  is_anonymous: boolean; // Whether the review is anonymous
  is_featured: boolean; // Whether this is a featured review
  is_moderated: boolean; // Whether this review has been moderated
  moderation_notes?: string; // Notes from moderation
  response_text?: string; // Response from the rated entity
  response_date?: Date; // When the response was posted
  created_at?: Date;
  updated_at?: Date;
}

interface RatingCreationAttributes
  extends Optional<
    RatingAttributes,
    | 'rating_id'
    | 'helpful_count'
    | 'reported_count'
    | 'is_verified'
    | 'is_anonymous'
    | 'is_featured'
    | 'is_moderated'
    | 'created_at'
    | 'updated_at'
  > {}

export class Rating
  extends Model<RatingAttributes, RatingCreationAttributes>
  implements RatingAttributes
{
  public rating_id!: string;
  public reviewer_id!: string;
  public reviewee_id?: string;
  public pet_id?: string;
  public rescue_id?: string;
  public application_id?: string;
  public rating_type!: RatingType;
  public category!: RatingCategory;
  public score!: number;
  public title?: string;
  public review_text?: string;
  public pros?: string[];
  public cons?: string[];
  public helpful_count!: number;
  public reported_count!: number;
  public is_verified!: boolean;
  public is_anonymous!: boolean;
  public is_featured!: boolean;
  public is_moderated!: boolean;
  public moderation_notes?: string;
  public response_text?: string;
  public response_date?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Instance methods
  public markAsHelpful(): void {
    this.helpful_count += 1;
  }

  public report(): void {
    this.reported_count += 1;
  }

  public addResponse(response: string): void {
    this.response_text = response;
    this.response_date = new Date();
  }

  public moderate(notes: string): void {
    this.is_moderated = true;
    this.moderation_notes = notes;
  }

  public feature(): void {
    this.is_featured = true;
  }

  public unfeature(): void {
    this.is_featured = false;
  }

  // Static methods
  public static async getAverageRating(
    entityType: 'pet' | 'rescue' | 'user',
    entityId: string,
    category?: RatingCategory
  ): Promise<{ average: number; count: number; distribution: Record<number, number> }> {
    const whereClause: WhereOptions<RatingAttributes> = {
      is_moderated: true,
    };

    switch (entityType) {
      case 'pet':
        whereClause.pet_id = entityId;
        break;
      case 'rescue':
        whereClause.rescue_id = entityId;
        break;
      case 'user':
        whereClause.reviewee_id = entityId;
        break;
    }

    if (category) {
      whereClause.category = category;
    }

    const ratings = await Rating.findAll({
      where: whereClause,
      attributes: ['score'],
    });

    if (ratings.length === 0) {
      return { average: 0, count: 0, distribution: {} };
    }

    const scores = ratings.map(r => r.score);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const distribution: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = scores.filter(score => score === i).length;
    }

    return {
      average: Math.round(average * 10) / 10, // Round to 1 decimal place
      count: ratings.length,
      distribution,
    };
  }

  public static async getTopRated(
    entityType: 'pet' | 'rescue' | 'user',
    limit: number = 10,
    category?: RatingCategory
  ): Promise<Rating[]> {
    const whereClause: WhereOptions<RatingAttributes> = {
      is_moderated: true,
    };

    if (category) {
      whereClause.category = category;
    }

    return await Rating.findAll({
      where: whereClause,
      order: [
        ['score', 'DESC'],
        ['helpful_count', 'DESC'],
      ],
      limit,
    });
  }

  public static async getRecentReviews(
    entityType: 'pet' | 'rescue' | 'user',
    entityId: string,
    limit: number = 10
  ): Promise<Rating[]> {
    const whereClause: WhereOptions<RatingAttributes> = {
      is_moderated: true,
    };

    switch (entityType) {
      case 'pet':
        whereClause.pet_id = entityId;
        break;
      case 'rescue':
        whereClause.rescue_id = entityId;
        break;
      case 'user':
        whereClause.reviewee_id = entityId;
        break;
    }

    return await Rating.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
    });
  }
}

Rating.init(
  {
    rating_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(`'rating_' || left(md5(random()::text), 12)`),
    },
    reviewer_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    reviewee_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    pet_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'pets',
        key: 'pet_id',
      },
    },
    rescue_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
    },
    application_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'applications',
        key: 'application_id',
      },
    },
    rating_type: {
      type: DataTypes.ENUM(...Object.values(RatingType)),
      allowNull: false,
      validate: {
        isIn: [Object.values(RatingType)],
      },
    },
    category: {
      type: DataTypes.ENUM(...Object.values(RatingCategory)),
      allowNull: false,
      validate: {
        isIn: [Object.values(RatingCategory)],
      },
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        len: [0, 200],
      },
    },
    review_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000], // Maximum 5000 characters
      },
    },
    pros: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      validate: {
        isValidPros(value: string[]) {
          if (value && !Array.isArray(value)) {
            throw new Error('Pros must be an array');
          }
          if (value && value.some(item => typeof item !== 'string' || item.length > 200)) {
            throw new Error('Each pro must be a string with maximum 200 characters');
          }
        },
      },
    },
    cons: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      validate: {
        isValidCons(value: string[]) {
          if (value && !Array.isArray(value)) {
            throw new Error('Cons must be an array');
          }
          if (value && value.some(item => typeof item !== 'string' || item.length > 200)) {
            throw new Error('Each con must be a string with maximum 200 characters');
          }
        },
      },
    },
    helpful_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    reported_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_anonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_moderated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    moderation_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    response_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000], // Maximum 2000 characters for responses
      },
    },
    response_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'ratings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['rating_type', 'category'],
      },
      {
        fields: ['pet_id'],
      },
      {
        fields: ['rescue_id'],
      },
      {
        fields: ['reviewer_id'],
      },
      {
        fields: ['reviewee_id'],
      },
      {
        fields: ['score'],
      },
      {
        fields: ['is_featured'],
      },
      {
        fields: ['is_moderated'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

export default Rating;
