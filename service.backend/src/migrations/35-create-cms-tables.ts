import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('cms_content', {
    content_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    content_type: {
      type: DataTypes.ENUM('page', 'blog_post', 'help_article'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived', 'scheduled'),
      allowNull: false,
      defaultValue: 'draft',
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
    meta_title: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    meta_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    meta_keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    featured_image_url: {
      type: DataTypes.STRING(2000),
      allowNull: true,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    scheduled_publish_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    scheduled_unpublish_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    versions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    current_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    author_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'users', key: 'user_id' },
    },
    last_modified_by: {
      type: DataTypes.STRING,
      allowNull: true,
      references: { model: 'users', key: 'user_id' },
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
  });

  await queryInterface.addIndex('cms_content', ['slug'], { unique: true, name: 'cms_content_slug_unique' });
  await queryInterface.addIndex('cms_content', ['content_type'], { name: 'cms_content_type_idx' });
  await queryInterface.addIndex('cms_content', ['status'], { name: 'cms_content_status_idx' });
  await queryInterface.addIndex('cms_content', ['author_id'], { name: 'cms_content_author_idx' });
  await queryInterface.addIndex('cms_content', ['published_at'], { name: 'cms_content_published_at_idx' });
  await queryInterface.addIndex('cms_content', ['scheduled_publish_at'], { name: 'cms_content_scheduled_publish_idx' });

  await queryInterface.createTable('cms_navigation_menus', {
    menu_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    location: {
      type: DataTypes.ENUM('header', 'footer', 'sidebar'),
      allowNull: false,
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'users', key: 'user_id' },
    },
    last_modified_by: {
      type: DataTypes.STRING,
      allowNull: true,
      references: { model: 'users', key: 'user_id' },
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
  });

  await queryInterface.addIndex('cms_navigation_menus', ['location'], { name: 'cms_nav_location_idx' });
  await queryInterface.addIndex('cms_navigation_menus', ['is_active'], { name: 'cms_nav_active_idx' });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('cms_navigation_menus');
  await queryInterface.dropTable('cms_content');
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_cms_content_content_type";
     DROP TYPE IF EXISTS "enum_cms_content_status";
     DROP TYPE IF EXISTS "enum_cms_navigation_menus_location";`
  );
}
