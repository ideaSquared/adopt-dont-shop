# @adopt-dont-shop/lib.utils

Shared utilities for the Adopt Don't Shop monorepo. Currently focused on UK-locale data formatting (dates, currency, phone, address) plus an environment-config helper and a thin `UtilsService` class.

> **Heads-up:** Earlier drafts of this document advertised a much larger surface (`validateEmail`, `generateId`, `debounce`, `sanitizeInput`, deep cloning, etc.). Those helpers are not exported from this package today. The canonical surface is whatever appears in [`lib.utils/src/index.ts`](../../lib.utils/src/index.ts).

## 📦 Installation

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.utils": "*"
  }
}
```

Run `npm install` at the repo root to link the workspace.

## What's Actually Exported

From `lib.utils/src/index.ts`:

- `UtilsService` (class) and `UtilsServiceConfig`, `UtilsServiceOptions` (types)
- Re-exports from `./env` — environment-URL helpers
- Re-exports from `./locale` — UK locale formatters

### Locale formatters

| Function                        | From                | Notes                                             |
| ------------------------------- | ------------------- | ------------------------------------------------- |
| `formatDate(date)`              | `locale/date`       | UK format (DD/MM/YYYY)                            |
| `formatDateTime(date)`          | `locale/date`       | UK date + time                                    |
| `formatTime(date)`              | `locale/date`       | UK 24-hour time                                   |
| `formatRelativeDate(date)`      | `locale/date`       | "2 hours ago" style                               |
| `formatCustomDate(date, fmt)`   | `locale/date`       | Custom pattern                                    |
| `formatCurrency(amount, opts?)` | `locale/currency`   | GBP, two decimals by default                      |
| `formatCurrencyWhole(amount)`   | `locale/currency`   | GBP without decimals                              |
| `formatNumber(amount, dp?)`     | `locale/currency`   | Plain number formatter                            |
| `parseCurrency(str)`            | `locale/currency`   | Parses a currency string back to a number         |
| `formatPhoneNumber(s, intl?)`   | `locale/phone`      | UK phone formatting                               |
| `validatePhoneNumber(s)`        | `locale/phone`      | UK phone validation                               |
| `getPhonePlaceholder(type?)`    | `locale/phone`      | Placeholder string for inputs                     |
| `validatePostcode(s)`           | `locale/address`    | UK postcode validation                            |
| `formatPostcode(s)`             | `locale/address`    | Normalises a UK postcode                          |
| `getPostcodePlaceholder()`      | `locale/address`    | Placeholder string for inputs                     |
| `UK_ADDRESS_CONFIG`             | `locale/address`    | Address-form config object                        |
| `UK_COUNTIES`, `UKCounty`       | `locale/address`    | List of counties + branded type                   |

### Environment helpers

`./env` exports `EnvironmentUrls`, `EnvironmentConfig`, default URL maps, and helpers for resolving the API / WebSocket base URL based on the runtime mode.

### `UtilsService`

A thin class wrapper exported alongside the helpers. See [`lib.utils/src/services/utils-service.ts`](../../lib.utils/src/services/utils-service.ts) for the current method set — the class is currently a small surface (constructor + config + cache).

## 🚀 Quick Start

```typescript
import { formatDate, formatCurrency, formatPhoneNumber } from '@adopt-dont-shop/lib.utils';

formatDate(new Date());                 // "25/04/2026"
formatCurrency(250);                    // "£250.00"
formatPhoneNumber('07700900123');       // "07700 900123"
```

## 🧪 Testing

```bash
npx turbo test --filter=@adopt-dont-shop/lib.utils
```

## Related Docs

- [Library ecosystem overview](./README.md)
- [`lib.utils/README.md`](../../lib.utils/README.md)
