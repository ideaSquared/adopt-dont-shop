import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';

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
  createdBy: string;
  lastModifiedBy?: string;
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
  public createdBy!: string;
  public lastModifiedBy?: string;
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
    createdBy: {
      type: getUuidType(),
      allowNull: false,
      field: 'created_by',
      references: { model: 'users', key: 'user_id' },
      onDelete: 'SET NULL',
    },
    lastModifiedBy: {
      type: getUuidType(),
      allowNull: true,
      field: 'last_modified_by',
      references: { model: 'users', key: 'user_id' },
      onDelete: 'SET NULL',
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
  },
  {
    sequelize,
    tableName: 'cms_navigation_menus',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['location'] },
      { fields: ['is_active'] },
      { fields: ['created_by'] },
      { fields: ['last_modified_by'] },
    ],
  }
);

export default NavigationMenu;
