---
name: uk-localization
description: >
  UK-locale formatting and validation conventions — dates, phone numbers,
  postcodes, currency, addresses. Apply when displaying dates/times/money,
  validating user input, or rendering address fields anywhere in the apps.
---

# UK Localization

The platform is UK-only. All user-facing dates, times, phone numbers, postcodes,
and currency follow UK conventions via helpers in `@adopt-dont-shop/lib.utils`.

This skill is the **authoring guide** — when and how to reach for the helpers. The full inventory of
helpers, formats, address fields, and signatures lives in the canonical reference,
[`docs/UK_LOCALIZATION.md`](../../../docs/UK_LOCALIZATION.md); don't restate it here. Everything below
imports from `@adopt-dont-shop/lib.utils`.

## Dates and times

```typescript
formatDate(application.createdAt); // "19/01/2025"
formatDateTime(message.sentAt); // "19/01/2025 14:30"
formatTime(slot.startsAt); // "14:30"
formatRelativeDate(notification.createdAt); // "2 days ago"
```

**Never** use `toLocaleDateString()` without an explicit locale — the result
depends on the user's browser config and produces inconsistent display
("1/19/2025" vs "19/1/2025"). Always use the helpers.

Database timestamps are stored as ISO UTC strings. The formatters convert to
UK local time + DD/MM/YYYY at the display boundary. Don't convert in services or
in the schema — only at render.

## Currency

```typescript
formatCurrency(150); // "£150.00"
formatCurrency(1500.5); // "£1,500.50"
formatCurrencyWhole(150); // "£150"      — for round numbers
formatNumber(1234567); // "1,234,567"
```

Currency is always GBP. There's no multi-currency support — don't introduce one
without a product conversation. Store amounts in pence (integer) at the schema
boundary if precision matters, format at display.

## Phone numbers

```typescript
formatPhoneNumber('02012345678'); // "020 1234 5678"
formatPhoneNumber('+44 20 1234 5678'); // "020 1234 5678"  — normalises +44
validatePhoneNumber('not a phone'); // false
getPhonePlaceholder(); // "020 1234 5678"  (default 'any'); 'mobile' → "07123 456 789"
```

For form fields, set `placeholder={getPhonePlaceholder()}` and validate on
submit:

```typescript
const PhoneFieldSchema = z.string().refine(validatePhoneNumber, 'Enter a valid UK phone number');
```

## Postcodes

```typescript
validatePostcode('sw1a 1aa'); // true   — case-insensitive, space-tolerant
formatPostcode('sw1a1aa'); // "SW1A 1AA"
getPostcodePlaceholder(); // "SW1A 1AA"
```

Store the canonical formatted form (`"SW1A 1AA"`) at the schema boundary, not
the user's raw input. Format on submit before sending to the API:

```typescript
const cleaned = formatPostcode(values.postcode); // normalise before submit
```

The backend uses the same validator (shared from `lib.utils`) so a postcode that
passes the frontend will pass the backend.

## Addresses

UK addresses use the structured fields on `RescueAddress` (`apps/rescue/src/types/rescue.ts`):
`street`, `city` (labelled "Town/City"), `county` (optional), `postcode`, `country`. Labels and
placeholders come from `UK_ADDRESS_CONFIG` in `lib.utils`. **Don't** use a generic single-line address
field — postcode lookups and validation depend on the structured form.

The `UK_COUNTIES` constant exports the canonical list for SelectInput options.

```typescript
import { UK_COUNTIES } from '@adopt-dont-shop/lib.utils';

<SelectInput
  options={UK_COUNTIES.map(c => ({ value: c, label: c }))}
  value={values.county}
/>
```

## When NOT to format

- **API payloads** — send ISO dates (`2025-01-19T14:30:00Z`), pence-precise
  currency, canonical postcodes. Format ONLY at display.
- **Database columns** — store ISO dates, integer pence, canonical postcodes.
- **Log lines** — keep machine-readable formats so they're greppable.

The rule: format at the very last step before the user sees the value. Internal
boundaries (function calls, API requests, DB rows) use the canonical machine
form.

## i18n future

The platform is not currently i18n-ready. The helpers wrap `Intl.NumberFormat`
and `Intl.DateTimeFormat` with `en-GB` baked in. If/when the platform expands,
the helpers are the swap point — don't scatter locale-specific code outside
`lib.utils`.

## Common mistakes

- `new Date(x).toLocaleDateString()` without a locale → US format on US
  browsers, breaks consistency
- Hardcoded "GBP" / "£" symbols → use `formatCurrency`
- Storing display strings in the DB (`"19/01/2025"`) — opaque to queries,
  drifts with format changes. Store ISO.
- Validating postcode with a hand-rolled regex → use `validatePostcode`
- Sending the raw user-input postcode to the API → use `formatPostcode` first
- A generic single-line address `<input>` → use the structured fields
- Hardcoded county lists → use `UK_COUNTIES`
- US-style dollar amounts in any user-facing string

Canonical doc: [`docs/UK_LOCALIZATION.md`](../../../docs/UK_LOCALIZATION.md).
