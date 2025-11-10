# lib.utils

A comprehensive shared utility library providing common functions used across the adopt-dont-shop platform.

## Overview

This library provides over 25 utility functions organized into five main categories:
- **Date & Time Utilities**: Date formatting, relative time, parsing, business hours validation
- **String Utilities**: Slugification, truncation, sanitization, ID generation, text manipulation
- **Data Transformation**: Deep cloning, object merging, flattening/unflattening, array-to-map conversion
- **Validation Utilities**: Email, phone, URL, and file type validation with detailed error messages
- **Formatting Utilities**: Currency, file size, phone number, and address formatting

## Features

### Date & Time Operations
- Format dates in multiple formats (YYYY-MM-DD, ISO, locale-specific)
- Generate relative time strings ("2 hours ago", "just now")
- Parse date strings with validation
- Business hours validation (weekdays 9 AM - 5 PM)

### String Processing
- URL-safe slug generation with length limits
- Smart text truncation with word preservation
- HTML/XSS input sanitization
- Unique ID generation with prefix/suffix options
- Word capitalization utilities

### Data Transformation
- Deep object/array cloning with Date support
- Object merging with overwrite behavior
- Object flattening/unflattening with custom delimiters
- Array-to-Map conversion with key/value field selection

### Validation & Formatting
- Email validation with normalization
- Phone number validation and formatting
- URL validation
- File type validation with extension checks
- Currency formatting with locale support
- File size formatting (Bytes, KB, MB, GB)
- Address formatting with partial data handling

## Installation

```bash
npm install @adopt-dont-shop/lib-utils
```

## Usage

```typescript
import { UtilsService } from '@adopt-dont-shop/lib-utils';

const utils = new UtilsService({
  debug: false,
  timezone: 'UTC',
  currency: 'USD'
});

// Date formatting
const formatted = utils.formatDate(new Date(), { format: 'ISO' });
const relative = utils.formatRelativeTime(new Date(Date.now() - 3600000)); // "1 hour ago"

// String utilities
const slug = utils.slugify('Hello World!'); // "hello-world"
const truncated = utils.truncate('Long text...', { length: 20, preserveWords: true });
const safe = utils.sanitizeInput('<script>alert("xss")</script>');

// Validation
const emailResult = utils.isValidEmail('test@example.com');
if (emailResult.isValid) {
  console.log('Valid email:', emailResult.normalizedValue);
}

// Data transformation
const cloned = utils.deepClone({ nested: { data: [1, 2, 3] } });
const flattened = utils.flattenObject({ a: { b: { c: 1 } } }); // { 'a.b.c': 1 }

// Formatting
const price = utils.formatCurrency(1234.56); // "$1,234.56"
const size = utils.formatFileSize(1048576); // "1 MB"
const phone = utils.formatPhoneNumber('5551234567'); // "(555) 123-4567"
```

## Configuration

```typescript
// Initialize with custom config
const utils = new UtilsService({
  debug: true,
  timezone: 'America/New_York',
  currency: 'EUR'
});

// Update config at runtime
utils.updateConfig({ 
  debug: false,
  currency: 'GBP' 
});

// Get current config
const config = utils.getConfig();
```

## API Reference

### Date & Time Utilities
- `formatDate(date, options?)` - Format dates with multiple format options
- `formatRelativeTime(date)` - Generate relative time strings
- `parseDate(dateString)` - Parse and validate date strings
- `isBusinessHours(date?)` - Check if date falls within business hours

### String Utilities
- `slugify(text, options?)` - Create URL-safe slugs
- `truncate(text, options)` - Smart text truncation with word preservation
- `sanitizeInput(input)` - HTML/XSS sanitization
- `generateId(options?)` - Generate unique IDs with custom formatting
- `capitalizeWords(text)` - Capitalize first letter of each word

### Data Transformation
- `deepClone(obj)` - Deep clone objects, arrays, and dates
- `mergeObjects(...objects)` - Merge multiple objects with overwrite
- `flattenObject(obj, options?)` - Flatten nested objects
- `unflattenObject(obj, options?)` - Unflatten flattened objects
- `arrayToMap(array, options)` - Convert arrays to Maps

### Validation Utilities
- `isValidEmail(email)` - Email validation with normalization
- `isValidPhone(phone)` - Phone number validation
- `isValidURL(url)` - URL validation
- `validateFileType(filename, options?)` - File type validation

### Formatting Utilities
- `formatCurrency(amount, options?)` - Currency formatting with locale support
- `formatFileSize(bytes)` - File size formatting
- `formatPhoneNumber(phone, options?)` - Phone number formatting
- `formatAddress(address)` - Address formatting with partial data support

## Testing

```bash
npm test        # Run all tests
npm run lint    # Run TypeScript linting
npm run build   # Build the library
```

The library includes 55+ comprehensive tests covering all utility functions with edge cases and error handling.

## TypeScript Support

Fully typed with comprehensive interfaces:
- `DateFormatOptions`
- `TruncateOptions` 
- `SlugifyOptions`
- `ValidationResult`
- `CurrencyOptions`
- `AddressData`
- And more...

## Performance

All utilities are optimized for performance with minimal dependencies and efficient algorithms. The service supports configuration caching and includes health check functionality.

## Contributing

When adding new utilities:
1. Add the function to the appropriate category in `UtilsService`
2. Add TypeScript interfaces to `src/types/index.ts`
3. Write comprehensive tests covering edge cases
4. Update this README with usage examples
5. Ensure all tests pass and maintain type safety
