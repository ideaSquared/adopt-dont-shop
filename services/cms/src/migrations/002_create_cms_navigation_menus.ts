import type { MigrationBuilder } from 'node-pg-migrate';

// cms.cms_navigation_menus — top nav / footer link trees. Direct port
// of the monolith's NavigationMenu model + 00-baseline-061-cms-navigation-menus.ts.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('cms_navigation_menus', {
    menu_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    location: { type: 'varchar(50)', notNull: true },
    items: { type: 'jsonb', notNull: true, default: '[]' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('cms_navigation_menus', 'location', {
    name: 'cms_navigation_menus_location_idx',
  });
  pgm.createIndex('cms_navigation_menus', 'is_active', {
    name: 'cms_navigation_menus_active_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('cms_navigation_menus');
};
