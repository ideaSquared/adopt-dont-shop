/**
 * Generates a human-readable ID with a consistent format
 * Format: {prefix}_0000{random_8_chars}
 *
 * Examples:
 * - pet_0000a3b4c5d6
 * - user_0000x7y8z9w1
 * - rescue_0000m2n3p4q5
 *
 * @param prefix - The prefix for the ID (e.g., 'pet', 'user', 'rescue')
 * @returns A readable ID string in the format {prefix}_0000{8_random_chars}
 */
export const generateReadableId = (prefix: string): string => {
  // Generate 8 random alphanumeric characters using base36 (0-9, a-z)
  const randomPart = Math.random()
    .toString(36) // Convert to base36 (0-9, a-z)
    .substring(2, 10) // Take 8 characters, skipping '0.' prefix
    .padEnd(8, '0'); // Ensure exactly 8 characters

  return `${prefix}_0000${randomPart}`;
};

/**
 * Generates a SQL literal for PostgreSQL to create readable IDs at database level
 * This is used in Sequelize model definitions for defaultValue when not in test mode
 *
 * @param prefix - The prefix for the ID (e.g., 'pet', 'user', 'rescue')
 * @returns A string representing the SQL literal for PostgreSQL
 */
export const getReadableIdSqlLiteral = (prefix: string): string => {
  return `'${prefix}_0000' || left(md5(random()::text), 8)`;
};
