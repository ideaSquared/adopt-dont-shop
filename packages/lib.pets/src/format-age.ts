const pluralise = (count: number, unit: string): string =>
  `${count} ${unit}${count === 1 ? '' : 's'}`;

/**
 * Formats a pet's age for display, e.g. "2 years, 3 months", "1 year",
 * "6 months". Missing values count as zero; when both are zero the
 * `unknown` fallback is returned.
 */
export const formatAge = (
  years: number | undefined,
  months: number | undefined,
  unknown: string = 'Unknown'
): string => {
  const y = years ?? 0;
  const m = months ?? 0;
  if (y === 0 && m === 0) {
    return unknown;
  }
  if (y === 0) {
    return pluralise(m, 'month');
  }
  if (m === 0) {
    return pluralise(y, 'year');
  }
  return `${pluralise(y, 'year')}, ${pluralise(m, 'month')}`;
};
