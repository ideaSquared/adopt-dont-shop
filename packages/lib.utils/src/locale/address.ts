/**
 * UK Address Formatting and Validation Utilities
 * Format: Street, City, County (optional), Postcode, Country
 */

/**
 * Validate a UK postcode
 * Supports formats: AA9A 9AA, A9A 9AA, A9 9AA, A99 9AA, AA9 9AA, AA99 9AA
 * @param postcode - Postcode string to validate
 * @returns true if valid UK postcode format
 */
export function validatePostcode(postcode: string): boolean {
  // UK postcode regex
  // Supports: SW1A 1AA, M1 1AA, B33 8TH, CR2 6XH, DN55 1PT, etc.
  const postcodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i;

  const cleaned = postcode.trim().toUpperCase();
  return postcodeRegex.test(cleaned);
}

/**
 * Format a UK postcode to standard format (uppercase with space)
 * @param postcode - Postcode string to format
 * @returns Formatted postcode (e.g., "SW1A 1AA")
 */
export function formatPostcode(postcode: string): string {
  const cleaned = postcode.trim().toUpperCase().replace(/\s+/g, '');

  // Extract outward code (first part) and inward code (last 3 chars)
  if (cleaned.length >= 5 && cleaned.length <= 7) {
    const inward = cleaned.slice(-3);
    const outward = cleaned.slice(0, -3);
    return `${outward} ${inward}`;
  }

  return postcode; // Return as-is if we can't parse it
}

/**
 * Get a placeholder for UK postcode input
 * @returns Placeholder string
 */
export function getPostcodePlaceholder(): string {
  return 'SW1A 1AA';
}

/**
 * UK Address field labels and configuration
 */
export const UK_ADDRESS_CONFIG = {
  fields: {
    street: {
      label: 'Street Address',
      placeholder: '123 High Street',
      required: true,
    },
    city: {
      label: 'Town/City',
      placeholder: 'London',
      required: true,
    },
    county: {
      label: 'County',
      placeholder: 'Greater London',
      required: false,
    },
    postcode: {
      label: 'Postcode',
      placeholder: 'SW1A 1AA',
      required: true,
    },
    country: {
      label: 'Country',
      placeholder: 'United Kingdom',
      required: true,
    },
  },
  defaultCountry: 'United Kingdom',
} as const;

/**
 * List of UK counties for dropdown/autocomplete
 */
export const UK_COUNTIES = [
  'Bedfordshire',
  'Berkshire',
  'Bristol',
  'Buckinghamshire',
  'Cambridgeshire',
  'Cheshire',
  'City of London',
  'Cornwall',
  'Cumbria',
  'Derbyshire',
  'Devon',
  'Dorset',
  'Durham',
  'East Riding of Yorkshire',
  'East Sussex',
  'Essex',
  'Gloucestershire',
  'Greater London',
  'Greater Manchester',
  'Hampshire',
  'Herefordshire',
  'Hertfordshire',
  'Isle of Wight',
  'Kent',
  'Lancashire',
  'Leicestershire',
  'Lincolnshire',
  'Merseyside',
  'Norfolk',
  'North Yorkshire',
  'Northamptonshire',
  'Northumberland',
  'Nottinghamshire',
  'Oxfordshire',
  'Rutland',
  'Shropshire',
  'Somerset',
  'South Yorkshire',
  'Staffordshire',
  'Suffolk',
  'Surrey',
  'Tyne and Wear',
  'Warwickshire',
  'West Midlands',
  'West Sussex',
  'West Yorkshire',
  'Wiltshire',
  'Worcestershire',
] as const;

export type UKCounty = (typeof UK_COUNTIES)[number];
