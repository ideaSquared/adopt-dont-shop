import type { DateRangePreset, DateRangeValue } from './DateRangePicker';

const pad = (value: number): string => String(value).padStart(2, '0');

// Local-calendar ISO (`yyyy-mm-dd`). Built from local date parts rather than
// `toISOString()` so the UK day never slips to UTC's near midnight (BST).
const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const daysBefore = (from: Date, days: number): Date => {
  const result = new Date(from);
  result.setDate(result.getDate() - days);
  return result;
};

const relativeDays = (now: () => Date, days: number) => (): DateRangeValue => {
  const today = now();
  return { from: toIsoDate(daysBefore(today, days)), to: toIsoDate(today) };
};

const monthRange = (now: () => Date, monthOffset: number) => (): DateRangeValue => {
  const today = now();
  const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const last = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);
  return { from: toIsoDate(first), to: toIsoDate(last) };
};

/**
 * The standard relative date-range shortcuts (Last 7/30/90 days, This month,
 * Last month) — the set the rescue analytics picker historically offered. Each
 * range is computed against `now` at click time, so pass the array straight to
 * `DateRangePicker`'s `presets` prop and every selection reflects today's date.
 *
 * `now` is injectable purely for deterministic tests; production callers omit it.
 */
export const createDefaultDateRangePresets = (
  now: () => Date = () => new Date()
): DateRangePreset[] => [
  { label: 'Last 7 days', getRange: relativeDays(now, 7) },
  { label: 'Last 30 days', getRange: relativeDays(now, 30) },
  { label: 'Last 90 days', getRange: relativeDays(now, 90) },
  { label: 'This month', getRange: monthRange(now, 0) },
  { label: 'Last month', getRange: monthRange(now, -1) },
];
