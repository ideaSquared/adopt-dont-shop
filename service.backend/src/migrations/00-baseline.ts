/**
 * Baseline migration — Phase 1 data model refactor
 *
 * Establishes the schema from the Sequelize model definitions as of Phase 1.
 * This migration uses sequelize.sync({ force: true }) as its authoritative source,
 * which is the accepted approach for a dev-stage baseline.
 *
 * From Phase 2 onwards, every schema change must have a corresponding migration
 * that uses QueryInterface.createTable / addColumn / addIndex etc.
 */
import type { QueryInterface } from 'sequelize';
import sequelize from '../sequelize';
import '../models/index';

export default {
  up: async (_queryInterface: QueryInterface) => {
    await sequelize.sync({ force: true });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropAllTables();
  },
};
