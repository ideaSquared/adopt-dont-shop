# UK Data Localization Implementation Guide

## Overview

This document describes the UK data localization implementation for the Adopt Don't Shop rescue management application. This implementation focuses on **data format localization** (dates, addresses, phone numbers, currency) without translation - all text remains in English.

## Implementation Date

Implemented: January 2025

## Locale Configuration

**Default Locale:** `en-GB` (English - United Kingdom)
**Currency:** GBP (£)
**Date Format:** DD/MM/YYYY
**Time Format:** HH:mm (24-hour)
**Phone Format:** UK (e.g., 020 1234 5678 or +44 20 1234 5678)
**Address Format:** UK (Street, Town/City, County, Postcode, Country)

---

## 1. Locale Utilities Library

### Location
`lib.utils/src/locale/`

### Modules

#### `config.ts`
Centralized locale configuration:
```typescript
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
```

#### `date.ts`
Date and time formatting utilities:
- `formatDate(date)` - Returns DD/MM/YYYY format
- `formatDateTime(date)` - Returns DD/MM/YYYY HH:mm format
- `formatTime(date)` - Returns HH:mm format (24-hour)
- `formatRelativeDate(date)` - Returns "2 days ago" format
- `formatCustomDate(date, format)` - Custom date formatting

**Example Usage:**
```typescript
import { formatDate, formatDateTime } from '@adopt-dont-shop/lib-utils';

// Format a date
const displayDate = formatDate(new Date()); // "19/01/2025"

// Format date and time
const displayDateTime = formatDateTime(application.createdAt); // "19/01/2025 14:30"
```

#### `currency.ts`
GBP currency formatting utilities:
- `formatCurrency(amount)` - Returns £1,234.56 format
- `formatCurrencyWhole(amount)` - Returns £1,235 format (no decimals)
- `formatNumber(amount, decimals)` - Returns 1,234.56 format (no symbol)
- `parseCurrency(string)` - Parses currency string to number

**Example Usage:**
```typescript
import { formatCurrency } from '@adopt-dont-shop/lib-utils';

// Format adoption fee
const feeDisplay = formatCurrency(150.00); // "£150.00"
```

#### `phone.ts`
UK phone number formatting and validation:
- `formatPhoneNumber(phone, international)` - Formats UK phone numbers
- `validatePhoneNumber(phone)` - Validates UK phone format
- `getPhonePlaceholder(type)` - Returns placeholder text

**Example Usage:**
```typescript
import { formatPhoneNumber, getPhonePlaceholder } from '@adopt-dont-shop/lib-utils';

// Format phone number
const display = formatPhoneNumber('02012345678'); // "020 1234 5678"

// Get placeholder
const placeholder = getPhonePlaceholder('mobile'); // "07123 456 789"
```

#### `address.ts`
UK address formatting and validation:
- `validatePostcode(postcode)` - Validates UK postcode format
- `formatPostcode(postcode)` - Formats to standard UK postcode
- `getPostcodePlaceholder()` - Returns "SW1A 1AA"
- `UK_ADDRESS_CONFIG` - Field labels and configuration
- `UK_COUNTIES` - List of UK counties

**Example Usage:**
```typescript
import { validatePostcode, formatPostcode, UK_COUNTIES } from '@adopt-dont-shop/lib-utils';

// Validate postcode
const isValid = validatePostcode('SW1A1AA'); // true

// Format postcode
const formatted = formatPostcode('sw1a1aa'); // "SW1A 1AA"

// Get county list
const countyOptions = UK_COUNTIES.map(county => ({
  value: county,
  label: county
}));
```

---

## 2. Type Definitions

### RescueAddress Interface

**Location:** `app.rescue/src/types/rescue.ts`

**Before (US Format):**
```typescript
export interface RescueAddress {
  street: string;
  city: string;
  state: string;      // US: State
  zipCode: string;    // US: ZIP Code
  country: string;
}
```

**After (UK Format):**
```typescript
export interface RescueAddress {
  street: string;
  city: string;
  county?: string;    // UK: County (optional)
  postcode: string;   // UK: Postcode
  country: string;
}
```

### Backend Model

**Location:** `service.backend/src/models/Rescue.ts`

**Key Changes:**
- `state` field → `county` (maps to existing `state` column)
- `zipCode` field → `postcode` (maps to existing `zip_code` column)
- Default country: `'United Kingdom'` (was `'US'`)
- County field is optional (`allowNull: true`)

**Database Compatibility:**
No database migration required - the model uses field mapping:
```typescript
county: {
  type: DataTypes.STRING,
  allowNull: true,
  field: 'state', // Maps to existing 'state' column
},
postcode: {
  type: DataTypes.STRING,
  allowNull: false,
  field: 'zip_code', // Maps to existing 'zip_code' column
},
```

---

## 3. Form Components

### RescueProfileForm

**Location:** `app.rescue/src/components/rescue/RescueProfileForm.tsx`

**UK-Specific Changes:**

| Field | Label | Placeholder | Notes |
|-------|-------|-------------|-------|
| Rescue Type | - | - | "Rescue Organisation" (UK spelling) |
| Email | Email Address * | contact@rescue.org.uk | .uk domain |
| Phone | Phone Number * | 020 1234 5678 | UK format |
| Website | Website | https://www.rescue.org.uk | .uk domain |
| Street | Street Address * | 123 High Street | UK street name |
| City | Town/City * | London | UK terminology |
| County | County | Greater London | Optional field |
| Postcode | Postcode * | SW1A 1AA | Auto-uppercase |
| Country | Country * | United Kingdom | UK first in list |

**Helper Text Updates:**
- "Main phone number for enquiries" (UK spelling: enquiries)

**Imports:**
```typescript
import { getPhonePlaceholder, getPostcodePlaceholder } from '@adopt-dont-shop/lib-utils';
```

**Postcode Auto-Uppercase:**
```typescript
onChange={(e) => handleChange('address.postcode', e.target.value.toUpperCase())}
```

### AdoptionPolicyForm

**Location:** `app.rescue/src/components/rescue/AdoptionPolicyForm.tsx`

**Currency Changes:**
- Labels: "Minimum Fee (£)" and "Maximum Fee (£)"
- Currency symbol: £ (GBP)

**Imports:**
```typescript
import { formatCurrency } from '@adopt-dont-shop/lib-utils';
```

---

## 4. Country Dropdown

**Order of Countries:**
1. United Kingdom (default)
2. Ireland
3. United States
4. Canada
5. Australia
6. Other

This ordering prioritizes UK/Ireland for the target market while maintaining flexibility for international rescues.

---

## 5. API Integration

### Request/Response Format

When sending rescue profile data to the API:

```typescript
// Frontend → Backend
{
  name: "Happy Paws Rescue",
  address: {
    street: "123 High Street",
    city: "London",
    county: "Greater London",  // Maps to 'state' in DB
    postcode: "SW1A 1AA",      // Maps to 'zip_code' in DB
    country: "United Kingdom"
  }
}
```

### Backend Field Mapping

The Sequelize model automatically handles the mapping:
- `county` (code) ↔ `state` (database)
- `postcode` (code) ↔ `zip_code` (database)

No API endpoint changes required.

---

## 6. Usage Examples

### Example 1: Display Rescue Address

```typescript
import { formatPostcode } from '@adopt-dont-shop/lib-utils';

function RescueAddressDisplay({ rescue }: { rescue: RescueProfile }) {
  return (
    <address>
      <div>{rescue.address.street}</div>
      <div>{rescue.address.city}</div>
      {rescue.address.county && <div>{rescue.address.county}</div>}
      <div>{formatPostcode(rescue.address.postcode)}</div>
      <div>{rescue.address.country}</div>
    </address>
  );
}
```

### Example 2: Format Phone Number for Display

```typescript
import { formatPhoneNumber } from '@adopt-dont-shop/lib-utils';

function ContactInfo({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone}`}>
      {formatPhoneNumber(phone)}  {/* Displays: "020 1234 5678" */}
    </a>
  );
}
```

### Example 3: Display Adoption Fee

```typescript
import { formatCurrency } from '@adopt-dont-shop/lib-utils';

function AdoptionFeeDisplay({ fee }: { fee: number }) {
  return (
    <div className="fee">
      Adoption Fee: {formatCurrency(fee)}  {/* Displays: "£150.00" */}
    </div>
  );
}
```

### Example 4: Format Application Date

```typescript
import { formatDate, formatRelativeDate } from '@adopt-dont-shop/lib-utils';

function ApplicationDate({ application }: { application: Application }) {
  return (
    <div>
      <time dateTime={application.createdAt}>
        {formatDate(application.createdAt)}  {/* "19/01/2025" */}
      </time>
      <span className="relative">
        ({formatRelativeDate(application.createdAt)})  {/* "2 days ago" */}
      </span>
    </div>
  );
}
```

---

## 7. Future Enhancements

### Adding US Format Support

To add US format switching in the future:

1. **Extend locale configuration:**
```typescript
export const LOCALE_CONFIGS = {
  'en-GB': { /* UK config */ },
  'en-US': {
    locale: 'en-US',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    // ...
  }
} as const;
```

2. **Create locale context:**
```typescript
const LocaleContext = createContext<'en-GB' | 'en-US'>('en-GB');
```

3. **Update components:**
- Use locale from context
- Conditionally render field labels
- Apply appropriate formatting

### Date Display Updates (Optional)

To update existing date displays throughout the app:

1. Import utilities:
```typescript
import { formatDate, formatDateTime } from '@adopt-dont-shop/lib-utils';
```

2. Replace date-fns calls:
```typescript
// Before
import { format } from 'date-fns';
const display = format(date, 'MM/dd/yyyy');

// After
import { formatDate } from '@adopt-dont-shop/lib-utils';
const display = formatDate(date); // Uses DD/MM/YYYY
```

3. Components to update:
- ApplicationCard.tsx
- ApplicationTimeline.tsx
- PetCard.tsx
- Dashboard.tsx
- ApplicationStageCard.tsx
- TimelineWidget.tsx

---

## 8. Testing Guidelines

### Manual Testing Checklist

**RescueProfileForm:**
- [ ] Postcode auto-converts to uppercase
- [ ] Postcode validation accepts UK formats (SW1A 1AA, M1 1AA, etc.)
- [ ] County field is optional (can be left blank)
- [ ] Phone number accepts UK formats
- [ ] Default country is "United Kingdom"
- [ ] All placeholders show UK examples

**AdoptionPolicyForm:**
- [ ] Currency displays with £ symbol
- [ ] Fee values format correctly (£150.00)

**Data Persistence:**
- [ ] Rescue profiles save with UK addresses
- [ ] Existing data remains accessible (backward compatible)
- [ ] API returns postcode/county fields correctly

### Test Data

**Valid UK Postcodes:**
- SW1A 1AA (Westminster)
- M1 1AA (Manchester)
- B33 8TH (Birmingham)
- CR2 6XH (South Croydon)
- DN55 1PT (Doncaster)
- GIR 0AA (Special postcode)

**Valid UK Phone Numbers:**
- 020 1234 5678 (London landline)
- 07123 456 789 (Mobile)
- 01234 567890 (Other landline)
- +44 20 1234 5678 (International format)

---

## 9. Migration Guide

### For Existing Rescue Data

**No database migration required** - the code uses field mapping to maintain backward compatibility with existing `state` and `zip_code` columns.

**If you want to clean up field names in the database (optional):**

```sql
-- Rename columns (PostgreSQL)
ALTER TABLE rescues
  RENAME COLUMN state TO county;

ALTER TABLE rescues
  RENAME COLUMN zip_code TO postcode;

-- Update default country
UPDATE rescues
  SET country = 'United Kingdom'
  WHERE country = 'US';
```

Then update the Sequelize model to remove field mappings:
```typescript
county: {
  type: DataTypes.STRING,
  allowNull: true,
  // Remove: field: 'state',
},
postcode: {
  type: DataTypes.STRING,
  allowNull: false,
  // Remove: field: 'zip_code',
},
```

---

## 10. Troubleshooting

### Common Issues

**Issue:** Postcode not validating
**Solution:** Ensure postcode follows UK format (outward code + space + inward code)

**Issue:** Phone number formatting incorrect
**Solution:** Use `formatPhoneNumber()` utility, ensure number starts with 0 or +44

**Issue:** TypeScript errors about `state` or `zipCode`
**Solution:** Update to use `county` and `postcode` fields from RescueAddress type

**Issue:** Currency showing $ instead of £
**Solution:** Import and use `formatCurrency()` from lib-utils

---

## 11. Related Documentation

- [Shared Libraries Documentation](../docs/SHARED_LIBRARIES.md)
- [lib.utils Documentation](../lib.utils/README.md)
- Backend API Documentation
- Frontend Component Library

---

## Support

For questions or issues related to UK localization:
1. Check this documentation
2. Review the locale utilities source code in `lib.utils/src/locale/`
3. Test with the examples provided above

---

**Last Updated:** January 2025
**Version:** 1.0.0
