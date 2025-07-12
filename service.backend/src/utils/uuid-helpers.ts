/**
 * UUID Helper Utilities
 * Different approaches to manage UUIDs without external packages
 */

import { randomUUID } from 'crypto';
import { QueryInterface, QueryTypes } from 'sequelize';

/**
 * OPTION 1: Use PostgreSQL's gen_random_uuid() function
 * Best for: Production use, guaranteed uniqueness, database-native
 */
export const insertWithPgUuid = async (
  queryInterface: QueryInterface,
  tableName: string,
  data: Record<string, unknown>[],
  uuidColumn = 'id'
) => {
  const columns = Object.keys(data[0]).filter(key => key !== uuidColumn);
  const placeholders = columns.map(col => `:${col}`).join(', ');
  const columnNames = columns.join(', ');

  for (const row of data) {
    await queryInterface.sequelize.query(
      `
      INSERT INTO ${tableName} (${uuidColumn}, ${columnNames})
      VALUES (gen_random_uuid(), ${placeholders})
    `,
      {
        replacements: row,
        type: QueryTypes.INSERT,
      }
    );
  }
};

/**
 * OPTION 2: Simple UUID v4 implementation (basic, no external deps)
 * Best for: Development/testing, when you can't use external packages
 */
export const generateSimpleUuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * OPTION 3: Use crypto.randomUUID() (Node.js 14.17.0+)
 * Best for: Modern Node.js environments, no external deps
 */
export const generateCryptoUuid = (): string => {
  try {
    return randomUUID();
  } catch {
    // Fallback to simple implementation if randomUUID is not available
    return generateSimpleUuid();
  }
};

/**
 * OPTION 4: Database DEFAULT handling
 * Let the database handle UUID generation automatically
 */
export const prepareBulkDataWithoutUuid = (
  data: Record<string, unknown>[],
  uuidColumn = 'id'
): Record<string, unknown>[] => {
  return data.map(row => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [uuidColumn]: _removed, ...rest } = row;
    return rest;
  });
};

/**
 * OPTION 5: Use Sequelize model creation (recommended for ORM)
 * Best for: When using Sequelize models properly
 */
export const createWithSequelizeModel = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Model: any,
  data: Record<string, unknown>[]
) => {
  const results = [];
  for (const row of data) {
    const instance = await Model.create(row);
    results.push(instance);
  }
  return results;
};

/**
 * Examples of usage in seeders:
 */
export const seedingExamples = {
  // Example 1: Using PostgreSQL gen_random_uuid()
  async postgresqlExample(queryInterface: QueryInterface) {
    const data = [
      { name: 'Test 1', value: 'A' },
      { name: 'Test 2', value: 'B' },
    ];

    await insertWithPgUuid(queryInterface, 'my_table', data, 'id');
  },

  // Example 2: Using simple UUID generation
  async simpleUuidExample(queryInterface: QueryInterface) {
    const data = [
      { id: generateSimpleUuid(), name: 'Test 1', value: 'A' },
      { id: generateSimpleUuid(), name: 'Test 2', value: 'B' },
    ];

    await queryInterface.bulkInsert('my_table', data);
  },

  // Example 3: Using crypto.randomUUID()
  async cryptoUuidExample(queryInterface: QueryInterface) {
    const data = [
      { id: generateCryptoUuid(), name: 'Test 1', value: 'A' },
      { id: generateCryptoUuid(), name: 'Test 2', value: 'B' },
    ];

    await queryInterface.bulkInsert('my_table', data);
  },

  // Example 4: Let database handle UUIDs
  async databaseDefaultExample(queryInterface: QueryInterface) {
    const dataWithUuids = [
      { id: 'some-uuid', name: 'Test 1', value: 'A' },
      { id: 'another-uuid', name: 'Test 2', value: 'B' },
    ];

    // Remove UUID fields, let database generate them
    const dataWithoutUuids = prepareBulkDataWithoutUuid(dataWithUuids, 'id');
    await queryInterface.bulkInsert('my_table', dataWithoutUuids);
  },
};
