import { ApiError } from '../middleware/error-handler';

export const validateSortField = (
  sortBy: string,
  allowedFields: readonly string[],
  defaultField: string
): string => {
  if (!allowedFields.includes(sortBy)) {
    throw new ApiError(
      400,
      `Invalid sort field "${sortBy}". Allowed fields: ${allowedFields.join(', ')}`
    );
  }
  return sortBy;
};

export const normaliseSortField = (
  sortBy: string | undefined,
  allowedFields: readonly string[],
  defaultField: string
): string => {
  if (!sortBy || !allowedFields.includes(sortBy)) {
    return defaultField;
  }
  return sortBy;
};

export type SortOrder = 'ASC' | 'DESC';

export const validateSortOrder = (sortOrder: unknown): SortOrder => {
  if (typeof sortOrder !== 'string') {
    return 'DESC';
  }
  const upper = sortOrder.toUpperCase();
  if (upper !== 'ASC' && upper !== 'DESC') {
    throw new ApiError(400, `Invalid sort order "${sortOrder}". Allowed: ASC, DESC`);
  }
  return upper;
};
