/**
 * Escapes SQL LIKE / iLike wildcard characters so user-supplied input is
 * treated as a literal substring rather than a pattern.
 *
 * Without escaping, a user search like '%' or '_' becomes a wildcard,
 * enabling enumeration ("show me everything") and DoS via full-table
 * scans. Backslash itself must be escaped first so subsequent
 * replacements don't double-escape the backslashes they emit.
 *
 * Pair with the standard `%foo%` wrap:
 *   { [Op.iLike]: `%${escapeLikePattern(userInput)}%` }
 */
export const escapeLikePattern = (input: string): string =>
  input.replace(/[\\%_]/g, (c) => `\\${c}`);
