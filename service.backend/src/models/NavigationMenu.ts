import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

export enum MenuLocation {
  HEADER = 'header',
  FOOTER = 'footer',
  SIDEBAR = 'sidebar',
}

export type NavigationItem = {
  id: string;
  label: string;
  url: string;
  openInNewTab: boolean;
  order: number;
  children?: NavigationItem[];
};

type NavigationMenuAttributes = {
  menuId: string;
  name: string;
  location: MenuLocation;
  items: NavigationItem[];
  isActive: boolean;
  // createdBy / lastModifiedBy removed — provided by auditColumns
  // (created_by / updated_by). Hook stamps from request context.
  createdAt: Date;
  updatedAt: Date;
};

type NavigationMenuCreationAttributes = Optional<
  NavigationMenuAttributes,
  'menuId' | 'createdAt' | 'updatedAt'
>;

class NavigationMenu
  extends Model<NavigationMenuAttributes, NavigationMenuCreationAttributes>
  implements NavigationMenuAttributes
{
  public menuId!: string;
  public name!: string;
  public location!: MenuLocation;
  public items!: NavigationItem[];
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

NavigationMenu.init(
  {
    menuId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'menu_id',
      defaultValue: () => generateUuidV7(),
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    location: {
      type: DataTypes.ENUM(...Object.values(MenuLocation)),
      allowNull: false,
    },
    items: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: [],
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    // createdBy / lastModifiedBy dropped — superseded by auditColumns
    // (created_by / updated_by). Hook stamps them from request context.
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
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'cms_navigation_menus',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['location'] },
      { fields: ['is_active'] },
      // created_by index now provided by auditIndexes('cms_navigation_menus').
      // last_modified_by column was dropped (replaced by updated_by).
      ...auditIndexes('cms_navigation_menus'),
    ],
  })
);

export default NavigationMenu;
