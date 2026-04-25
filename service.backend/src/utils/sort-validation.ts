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
