# UK Localization - Quick Reference

## At a Glance

### Data Formats

| Type | Format | Example |
|------|--------|---------|
| **Date** | DD/MM/YYYY | 19/01/2025 |
| **Time** | HH:mm (24-hour) | 14:30 |
| **Phone** | 0XXX XXX XXXX | 020 1234 5678 |
| **Postcode** | AA9A 9AA | SW1A 1AA |
| **Currency** | £X,XXX.XX | £150.00 |

---

## Import Statements

```typescript
// Date formatting
import { formatDate, formatDateTime, formatTime, formatRelativeDate } from '@adopt-dont-shop/lib-utils';

// Currency formatting
import { formatCurrency, formatCurrencyWhole, formatNumber } from '@adopt-dont-shop/lib-utils';

// Phone formatting
import { formatPhoneNumber, validatePhoneNumber, getPhonePlaceholder } from '@adopt-dont-shop/lib-utils';

// Address formatting
import { validatePostcode, formatPostcode, getPostcodePlaceholder, UK_COUNTIES } from '@adopt-dont-shop/lib-utils';

// Configuration
import { LOCALE_CONFIG } from '@adopt-dont-shop/lib-utils';
```

---

## Common Usage Patterns

### Format a Date
```typescript
const display = formatDate(application.createdAt);  // "19/01/2025"
```

### Format Currency
```typescript
const feeDisplay = formatCurrency(adoptionFee);  // "£150.00"
```

### Format Phone Number
```typescript
const phoneDisplay = formatPhoneNumber(rescue.phone);  // "020 1234 5678"
```

### Validate Postcode
```typescript
const isValid = validatePostcode(userInput);  // true/false
```

### Format Postcode
```typescript
const formatted = formatPostcode('sw1a1aa');  // "SW1A 1AA"
```

---

## Address Fields

### Field Names (NEW)
```typescript
interface RescueAddress {
  street: string;
  city: string;
  county?: string;   // Optional, was: state
  postcode: string;  // Was: zipCode
  country: string;
}
```

### Form Labels
- **Street:** "Street Address *"
- **City:** "Town/City *"
- **County:** "County" (optional)
- **Postcode:** "Postcode *"
- **Country:** "Country *"

### Placeholders
- **Street:** "123 High Street"
- **City:** "London"
- **County:** "Greater London"
- **Postcode:** "SW1A 1AA"
- **Country:** "United Kingdom" (default)

---

## Form Component Updates

### Text Input with Postcode
```typescript
<TextInput
  label="Postcode *"
  value={formData.address?.postcode || ''}
  onChange={(e) => handleChange('address.postcode', e.target.value.toUpperCase())}
  placeholder={getPostcodePlaceholder()}
  helperText="UK postcode format"
  required
  fullWidth
/>
```

### Text Input with Phone
```typescript
<TextInput
  label="Phone Number *"
  type="tel"
  value={formData.phone || ''}
  onChange={(e) => handleChange('phone', e.target.value)}
  placeholder={getPhonePlaceholder()}
  helperText="Main phone number for enquiries"
  required
  fullWidth
/>
```

### Currency Input
```typescript
<TextInput
  label="Adoption Fee (£)"
  type="number"
  min={0}
  step={0.01}
  value={formData.fee.toString()}
  onChange={(e) => handleFeeChange(e.target.value)}
  fullWidth
/>
```

---

## Display Components

### Display Date
```typescript
function DateDisplay({ date }: { date: string | Date }) {
  return <time>{formatDate(date)}</time>;
}
```

### Display Currency
```typescript
function PriceDisplay({ amount }: { amount: number }) {
  return <span className="price">{formatCurrency(amount)}</span>;
}
```

### Display Phone
```typescript
function PhoneLink({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone}`}>
      {formatPhoneNumber(phone)}
    </a>
  );
}
```

### Display Address
```typescript
function AddressBlock({ address }: { address: RescueAddress }) {
  return (
    <address>
      <div>{address.street}</div>
      <div>{address.city}</div>
      {address.county && <div>{address.county}</div>}
      <div>{formatPostcode(address.postcode)}</div>
      <div>{address.country}</div>
    </address>
  );
}
```

---

## UK Spelling Conventions

| US | UK |
|----|-----|
| organization | organisation |
| inquiries | enquiries |
| ZIP Code | Postcode |
| State | County |
| $ | £ |
| .org | .org.uk |

---

## Validation

### Postcode Validation
```typescript
if (!validatePostcode(postcode)) {
  setError('Please enter a valid UK postcode (e.g., SW1A 1AA)');
}
```

### Phone Validation
```typescript
if (!validatePhoneNumber(phone)) {
  setError('Please enter a valid UK phone number');
}
```

---

## Test Data

### Sample UK Addresses
```typescript
{
  street: "10 Downing Street",
  city: "London",
  county: "Greater London",
  postcode: "SW1A 2AA",
  country: "United Kingdom"
}

{
  street: "221B Baker Street",
  city: "London",
  county: "Greater London",
  postcode: "NW1 6XE",
  country: "United Kingdom"
}
```

### Sample Phone Numbers
- Landline: `020 7946 0958`
- Mobile: `07700 900123`
- International: `+44 20 7946 0958`

### Sample Postcodes
- `SW1A 1AA` (Westminster)
- `M1 1AA` (Manchester)
- `B33 8TH` (Birmingham)
- `EH1 1YZ` (Edinburgh)
- `CF10 1BH` (Cardiff)

---

## Debugging Tips

### Check Current Locale
```typescript
console.log(LOCALE_CONFIG.locale);  // "en-GB"
console.log(LOCALE_CONFIG.currency);  // "GBP"
```

### Verify Field Names
```typescript
// If you see errors about 'state' or 'zipCode', update to:
address.county  // instead of address.state
address.postcode  // instead of address.zipCode
```

### Check Imports
```typescript
// Make sure you're importing from lib-utils, not using direct date-fns
import { formatDate } from '@adopt-dont-shop/lib-utils';  // ✅ Correct
import { format } from 'date-fns';  // ❌ Wrong (will use default formatting)
```

---

## Migration Checklist

When updating a component to use UK localization:

- [ ] Update imports to use `@adopt-dont-shop/lib-utils`
- [ ] Replace `state` with `county` in address handling
- [ ] Replace `zipCode` with `postcode` in address handling
- [ ] Use `formatDate()` instead of direct `format()` calls
- [ ] Use `formatCurrency()` for money values
- [ ] Use `formatPhoneNumber()` for phone displays
- [ ] Update placeholders to UK examples
- [ ] Change "organization" to "organisation"
- [ ] Change "inquiries" to "enquiries"
- [ ] Use £ instead of $ for currency symbols

---

## Quick Links

- [Full Documentation](./UK_LOCALIZATION.md)
- [lib.utils Source](../lib.utils/src/locale/)
- [Example Components](../app.rescue/src/components/rescue/)

**Last Updated:** January 2025
