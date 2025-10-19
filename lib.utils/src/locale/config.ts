/**
 * Locale configuration for UK data formatting
 * All text remains in English - this only handles data format localization
 */

export const LOCALE_CONFIG = {
  locale: 'en-GB',
  currency: 'GBP',
  currencySymbol: '£',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  phoneFormat: 'uk',
  addressFormat: 'uk',
} as const;

export type LocaleConfig = typeof LOCALE_CONFIG;
