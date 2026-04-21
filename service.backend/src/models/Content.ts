import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getArrayType } from '../sequelize';
import { generateReadableId, getReadableIdSqlLiteral } from '../utils/readable-id';

export enum ContentType {
  PAGE = 'page',
  BLOG_POST = 'blog_post',
  HELP_ARTICLE = 'help_article',
}

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SCHEDULED = 'scheduled',
}

type ContentVersion = {
  version: number;
  title: string;
  content: string;
  excerpt: string | undefined;
  changedBy: string;
  changeNote: string | undefined;
  createdAt: Date;
};

type ContentAttributes = {
  contentId: string;
  title: string;
  slug: string;
  contentType: ContentType;
  status: ContentStatus;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredImageUrl?: string;
  publishedAt?: Date;
  scheduledPublishAt?: Date;
  scheduledUnpublishAt?: Date;
  versions: ContentVersion[];
  currentVersion: number;
  authorId: string;
  lastModifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

type ContentCreationAttributes = Optional<
  ContentAttributes,
  'contentId' | 'createdAt' | 'updatedAt'
>;

class Content
  extends Model<ContentAttributes, ContentCreationAttributes>
  implements ContentAttributes
{
  public contentId!: string;
  public title!: string;
  public slug!: string;
  public contentType!: ContentType;
  public status!: ContentStatus;
  public content!: string;
  public excerpt?: string;
  public metaTitle?: string;
  public metaDescription?: string;
  public metaKeywords?: string[];
  public featuredImageUrl?: string;
  public publishedAt?: Date;
  public scheduledPublishAt?: Date;
  public scheduledUnpublishAt?: Date;
  public versions!: ContentVersion[];
  public currentVersion!: number;
  public authorId!: string;
  public lastModifiedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;

  public isPublished(): boolean {
    return this.status === ContentStatus.PUBLISHED;
  }

  public isDraft(): boolean {
    return this.status === ContentStatus.DRAFT;
  }

  public addVersion(
    title: string,
    content: string,
    excerpt: string | undefined,
    changedBy: string,
    changeNote?: string
  ): void {
    const newVersion: ContentVersion = {
      version: this.currentVersion + 1,
      title,
      content,
      excerpt,
      changedBy,
      changeNote,
      createdAt: new Date(),
    };

    this.versions = [...this.versions, newVersion];
    this.currentVersion = newVersion.version;
    this.title = title;
    this.content = content;
    this.excerpt = excerpt;
    this.lastModifiedBy = changedBy;
  }

  public getVersion(version: number): ContentVersion | undefined {
    return this.versions.find(v => v.version === version);
  }
}

Content.init(
  {
    contentId: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'content_id',
      defaultValue:
        process.env.NODE_ENV === 'test'
          ? () => generateReadableId('content')
          : sequelize.literal(getReadableIdSqlLiteral('content')),
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 500],
      },
    },
    slug: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      },
    },
    contentType: {
      type: DataTypes.ENUM(...Object.values(ContentType)),
      allowNull: false,
      field: 'content_type',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ContentStatus)),
      allowNull: false,
      defaultValue: ContentStatus.DRAFT,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metaTitle: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'meta_title',
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'meta_description',
    },
    metaKeywords: {
      type: getArrayType(DataTypes.STRING),
      allowNull: false,
      defaultValue: process.env.NODE_ENV === 'test' ? '[]' : [],
      field: 'meta_keywords',
      get() {
        const raw = this.getDataValue('metaKeywords');
        if (typeof raw === 'string') {
          try {
            return JSON.parse(raw);
          } catch {
            return [];
          }
        }
        return raw || [];
      },
      set(value: string[]) {
        if (process.env.NODE_ENV === 'test') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.setDataValue('metaKeywords', JSON.stringify(value || []) as any);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.setDataValue('metaKeywords', value || ([] as any));
        }
      },
    },
    featuredImageUrl: {
      type: DataTypes.STRING(2000),
      allowNull: true,
      field: 'featured_image_url',
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at',
    },
    scheduledPublishAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_publish_at',
    },
    scheduledUnpublishAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_unpublish_at',
    },
    versions: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: [],
    },
    currentVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'current_version',
      validate: { min: 1 },
    },
    authorId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'author_id',
      references: { model: 'users', key: 'user_id' },
    },
    lastModifiedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_modified_by',
      references: { model: 'users', key: 'user_id' },
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'cms_content',
    timestamps: true,
    paranoid: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['content_type'] },
      { fields: ['status'] },
      { fields: ['author_id'] },
      { fields: ['published_at'] },
      { fields: ['scheduled_publish_at'] },
    ],
  }
);

export default Content;
