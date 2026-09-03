# UK localization reference

_What UK-locale formatting exists and how to apply it: dates, phone numbers, postcodes, currency, and
addresses. This is the "what exists" reference; authoring rules (when to reach for each helper) live
in the [`uk-localization` skill](../.claude/skills/uk-localization/SKILL.md). The app displays UK
data formats (`en-GB`) — all UI text stays in English; only data formatting is localized._

## Formats at a glance

| Type     | Format                   | Example       |
| -------- | ------------------------ | ------------- |
| Date     | DD/MM/YYYY               | 19/01/2025    |
| Time     | HH:mm (24-hour)          | 14:30         |
| Phone    | UK grouped               | 020 1234 5678 |
| Postcode | Outward + space + inward | SW1A 1AA      |
| Currency | £X,XXX.XX (GBP)          | £150.00       |

`LOCALE_CONFIG` (`packages/lib.utils/src/locale/config.ts`) is the single source: `locale: 'en-GB'`,
`currency: 'GBP'`, `currencySymbol: '£'`, `dateFormat: 'dd/MM/yyyy'`, `timeFormat: 'HH:mm'`.

## Helper index

All exported from `@adopt-dont-shop/lib.utils` (source under `packages/lib.utils/src/locale/`, except
`safeFormatDate`).

| Helper                   | Module        | Signature → returns                         | Example                                                      |
| ------------------------ | ------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `formatDate`             | `date.ts`     | `(date)` → DD/MM/YYYY                       | `formatDate(d)` → `"19/01/2025"`                             |
| `formatDateTime`         | `date.ts`     | `(date)` → DD/MM/YYYY HH:mm                 | `"19/01/2025 14:30"`                                         |
| `formatTime`             | `date.ts`     | `(date)` → HH:mm                            | `"14:30"`                                                    |
| `formatRelativeDate`     | `date.ts`     | `(date)` → relative                         | `"2 days ago"`                                               |
| `formatDisplayDate`      | `date.ts`     | `(date, { includeTime? }?)` → `d MMM yyyy`  | `"19 Jan 2025"` (or `"19 Jan 2025, 14:30"`)                  |
| `formatCustomDate`       | `date.ts`     | `(date, formatString)` → custom             | date-fns format string                                       |
| `safeFormatDate`         | `index.ts`    | `(date \| null \| undefined, ...)` → string | **use for nullable timestamps** — null-safe                  |
| `formatCurrency`         | `currency.ts` | `(amount, options?)` → £X,XXX.XX            | `formatCurrency(150)` → `"£150.00"`                          |
| `formatCurrencyWhole`    | `currency.ts` | `(amount)` → £X,XXX                         | `"£150"`                                                     |
| `formatNumber`           | `currency.ts` | `(amount, decimals=2)` → grouped, no symbol | `"1,234.56"`                                                 |
| `parseCurrency`          | `currency.ts` | `(string)` → number                         | `parseCurrency("£150.00")` → `150`                           |
| `formatPhoneNumber`      | `phone.ts`    | `(phone, international=false)` → grouped    | `"020 1234 5678"`                                            |
| `validatePhoneNumber`    | `phone.ts`    | `(phone)` → boolean                         | —                                                            |
| `getPhonePlaceholder`    | `phone.ts`    | `(type='any')` → placeholder                | mobile → `"07123 456 789"`, landline/any → `"020 1234 5678"` |
| `validatePostcode`       | `address.ts`  | `(postcode)` → boolean                      | `validatePostcode("SW1A1AA")` → `true`                       |
| `formatPostcode`         | `address.ts`  | `(postcode)` → normalized                   | `formatPostcode("sw1a1aa")` → `"SW1A 1AA"`                   |
| `getPostcodePlaceholder` | `address.ts`  | `()` → `"SW1A 1AA"`                         | —                                                            |
| `UK_ADDRESS_CONFIG`      | `address.ts`  | address field labels/placeholders           | —                                                            |
| `UK_COUNTIES`            | `address.ts`  | UK county list                              | for dropdowns                                                |

Import from the package root, never from `date-fns` directly (that would use the default US format):

```typescript
import {
  formatDate,
  formatCurrency,
  formatPhoneNumber,
  safeFormatDate,
} from '@adopt-dont-shop/lib.utils';
```

## Address fields

The frontend `RescueAddress` type (`apps/rescue/src/types/rescue.ts`) — county is optional:

```typescript
interface RescueAddress {
  street: string;
  city: string; // labelled "Town/City"
  county?: string; // optional
  postcode: string;
  country: string;
}
```

Backend column names are `county` / `postcode`; see the `services/rescue` migrations for the
authoritative schema. Field labels and placeholders come from `UK_ADDRESS_CONFIG`:

| Field    | Label          | Placeholder       | Required |
| -------- | -------------- | ----------------- | -------- |
| street   | Street Address | `123 High Street` | yes      |
| city     | Town/City      | `London`          | yes      |
| county   | County         | `Greater London`  | no       |
| postcode | Postcode       | `SW1A 1AA`        | yes      |
| country  | Country        | `United Kingdom`  | yes      |

Country dropdown order prioritizes the target market: United Kingdom (default), Ireland, United
States, Canada, Australia, Other.

## UK spelling conventions

| US           | UK           |
| ------------ | ------------ |
| organization | organisation |
| inquiries    | enquiries    |
| ZIP Code     | Postcode     |
| State        | County       |
| $            | £            |
| .org         | .org.uk      |

## Form examples

Use `FormField` + `Input` from `@adopt-dont-shop/lib.components` (raw `<input>` and the deprecated
`TextInput` are counted as debt by `pnpm check:forms`). The live examples are
`apps/rescue/src/components/rescue/RescueProfileForm.tsx` and `AdoptionPolicyForm.tsx`.

Postcode (auto-uppercase):

```tsx
import { FormField, Input } from '@adopt-dont-shop/lib.components';
import { getPostcodePlaceholder } from '@adopt-dont-shop/lib.utils';

<FormField label='Postcode' htmlFor='rescue-postcode' required error={errors.postcode}>
  <Input
    id='rescue-postcode'
    value={formData.address?.postcode ?? ''}
    onChange={e => handleAddressField('postcode', e.target.value.toUpperCase())}
    placeholder={getPostcodePlaceholder()}
    aria-invalid={!!errors.postcode}
  />
</FormField>;
```

Phone:

```tsx
<FormField label='Phone Number' htmlFor='rescue-phone' required error={errors.phone}>
  <Input
    id='rescue-phone'
    type='tel'
    value={formData.phone ?? ''}
    onChange={e => handleChange('phone', e.target.value)}
    placeholder={getPhonePlaceholder()}
    helperText='Main phone number for enquiries'
  />
</FormField>
```

## Display examples

```tsx
import { formatPostcode, formatPhoneNumber, formatCurrency, safeFormatDate } from '@adopt-dont-shop/lib.utils';

// Address block
<address>
  <div>{address.street}</div>
  <div>{address.city}</div>
  {address.county && <div>{address.county}</div>}
  <div>{formatPostcode(address.postcode)}</div>
  <div>{address.country}</div>
</address>

// Phone link
<a href={`tel:${phone}`}>{formatPhoneNumber(phone)}</a>

// Adoption fee
<span>{formatCurrency(fee)}</span>          {/* "£150.00" */}

// Nullable timestamp — safeFormatDate returns a fallback string instead of throwing
<time>{safeFormatDate(application.approvedAt)}</time>
```

## Validation

```typescript
if (!validatePostcode(postcode)) setError('Please enter a valid UK postcode (e.g., SW1A 1AA)');
if (!validatePhoneNumber(phone)) setError('Please enter a valid UK phone number');
```

## Migrating a component to UK localization

1. Replace `date-fns` `format()` calls with `formatDate` / `formatDateTime` / `safeFormatDate` from
   `@adopt-dont-shop/lib.utils`. **Done when:** no `date-fns` import remains in the component.
2. Replace `state` with `county` and `zipCode` with `postcode` in address handling. **Done when:**
   `type-check` passes with the `RescueAddress` fields.
3. Use `formatCurrency` for money and `formatPhoneNumber` for phone display. **Done when:** no raw
   `£`/number concatenation remains.
4. Update placeholders to the UK examples above and switch `FormField` + `Input` (drop any
   `TextInput`). **Done when:** `pnpm check:forms` does not regress.
5. Apply UK spelling (organisation, enquiries). **Done when:** the copy review passes.

## Test data

Valid postcodes: `SW1A 1AA`, `M1 1AA`, `B33 8TH`, `EH1 1YZ`, `CF10 1BH`, `GIR 0AA`.
Valid phone numbers: `020 7946 0958` (landline), `07700 900123` (mobile), `+44 20 7946 0958`
(international).

## Related

- [`uk-localization` skill](../.claude/skills/uk-localization/SKILL.md) — authoring rules
- [`packages/lib.utils/README.md`](../packages/lib.utils/README.md) — the helpers' package
- Locale source: `packages/lib.utils/src/locale/`
- Example components: `apps/rescue/src/components/rescue/`
