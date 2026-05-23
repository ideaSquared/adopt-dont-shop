/**
 * Consolidated baseline migration — creates all tables from models.
 *
 * In early alpha the schema is defined entirely by Sequelize models;
 * `sequelize.sync()` creates every table, index, and constraint
 * declared in `Model.init()`. Incremental migrations will be added
 * on top of this baseline once the schema stabilises for v1.
 */
import type { QueryInterface } from 'sequelize';
import sequelize from '../sequelize';
import '../models/index';

export default {
  up: async (_queryInterface: QueryInterface) => {
    await sequelize.sync();
  },

  down: async (queryInterface: QueryInterface) => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to drop all tables in production. Restore from backup instead.');
    }
    await queryInterface.dropAllTables();
  },
};
