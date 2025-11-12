# @adopt-dont-shop/lib-utils

Comprehensive utility library with data validation, formatting, date handling, and common helper functions

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-utils

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-utils": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import {
  formatDate,
  validateEmail,
  generateId,
  debounce,
  formatCurrency,
  sanitizeInput,
} from '@adopt-dont-shop/lib-utils';

// Date formatting
const formatted = formatDate(new Date(), 'YYYY-MM-DD');

// Email validation
const isValid = validateEmail('user@example.com');

// ID generation
const uniqueId = generateId('pet');

// Debouncing
const debouncedSearch = debounce(searchFunction, 300);

// Currency formatting
const price = formatCurrency(250, 'USD');

// Input sanitization
const clean = sanitizeInput(userInput);
```

## 📖 API Reference

### Date and Time Utilities

#### `formatDate(date, format?, timezone?)`

Format dates with various patterns and timezone support.

```typescript
import { formatDate } from '@adopt-dont-shop/lib-utils';

// Basic formatting
formatDate(new Date(), 'YYYY-MM-DD'); // '2024-01-15'
formatDate(new Date(), 'MM/DD/YYYY'); // '01/15/2024'
formatDate(new Date(), 'DD MMM YYYY'); // '15 Jan 2024'

// Time formatting
formatDate(new Date(), 'HH:mm:ss'); // '14:30:45'
formatDate(new Date(), 'h:mm A'); // '2:30 PM'

// Combined date and time
formatDate(new Date(), 'YYYY-MM-DD HH:mm'); // '2024-01-15 14:30'
formatDate(new Date(), 'MMM DD, YYYY h:mm A'); // 'Jan 15, 2024 2:30 PM'

// Timezone support
formatDate(new Date(), 'YYYY-MM-DD HH:mm', 'America/Los_Angeles');
```

#### `timeAgo(date, options?)`

Get human-readable relative time.

```typescript
import { timeAgo } from '@adopt-dont-shop/lib-utils';

timeAgo(new Date(Date.now() - 60000)); // '1 minute ago'
timeAgo(new Date(Date.now() - 3600000)); // '1 hour ago'
timeAgo(new Date(Date.now() - 86400000)); // '1 day ago'

// With options
timeAgo(pastDate, {
  addSuffix: true,
  includeSeconds: true,
  locale: 'en',
});
```

#### `calculateAge(birthDate, referenceDate?)`

Calculate age in years, months, or days.

```typescript
import { calculateAge } from '@adopt-dont-shop/lib-utils';

const age = calculateAge('2020-03-15'); // { years: 3, months: 10, days: 1 }
const ageInYears = calculateAge('2020-03-15', { unit: 'years' }); // 3
const ageInMonths = calculateAge('2020-03-15', { unit: 'months' }); // 46
```

#### `isValidDate(date)`

Check if a value is a valid date.

```typescript
import { isValidDate } from '@adopt-dont-shop/lib-utils';

isValidDate(new Date()); // true
isValidDate('2024-01-15'); // true
isValidDate('invalid-date'); // false
isValidDate(null); // false
```

### Validation Utilities

#### `validateEmail(email)`

Validate email addresses with comprehensive pattern matching.

```typescript
import { validateEmail } from '@adopt-dont-shop/lib-utils';

validateEmail('user@example.com'); // true
validateEmail('user.name+tag@example.co.uk'); // true
validateEmail('invalid.email'); // false
validateEmail(''); // false
```

#### `validatePhone(phone, country?)`

Validate phone numbers with international support.

```typescript
import { validatePhone } from '@adopt-dont-shop/lib-utils';

validatePhone('555-123-4567'); // true
validatePhone('(555) 123-4567'); // true
validatePhone('+1-555-123-4567', 'US'); // true
validatePhone('+44 20 7946 0958', 'UK'); // true
```

#### `validateUrl(url, options?)`

Validate URLs with protocol and domain checking.

```typescript
import { validateUrl } from '@adopt-dont-shop/lib-utils';

validateUrl('https://example.com'); // true
validateUrl('http://localhost:3000'); // true
validateUrl('ftp://files.example.com'); // true

// With options
validateUrl('https://example.com', {
  requireHttps: true,
  allowedDomains: ['example.com', 'api.example.com'],
});
```

#### `validateInput(input, rules)`

Validate input against custom rules.

```typescript
import { validateInput } from '@adopt-dont-shop/lib-utils';

const rules = {
  required: true,
  minLength: 3,
  maxLength: 50,
  pattern: /^[a-zA-Z\s]+$/,
  customValidator: value => value !== 'forbidden',
};

const result = validateInput('John Doe', rules);
// Returns: { isValid: true, errors: [] }

const invalidResult = validateInput('X', rules);
// Returns: { isValid: false, errors: ['Must be at least 3 characters'] }
```

### String Utilities

#### `sanitizeInput(input, options?)`

Sanitize user input to prevent XSS and injection attacks.

```typescript
import { sanitizeInput } from '@adopt-dont-shop/lib-utils';

sanitizeInput('<script>alert("xss")</script>Hello'); // 'Hello'
sanitizeInput('User "name" & data'); // 'User &quot;name&quot; &amp; data'

// With options
sanitizeInput(input, {
  allowedTags: ['b', 'i', 'em', 'strong'],
  stripWhitespace: true,
  maxLength: 100,
});
```

#### `slugify(text, options?)`

Convert text to URL-friendly slugs.

```typescript
import { slugify } from '@adopt-dont-shop/lib-utils';

slugify('Happy Tails Rescue'); // 'happy-tails-rescue'
slugify('Adoption Event @ Central Park!'); // 'adoption-event-central-park'

// With options
slugify('Text with Émojis 🐕', {
  replacement: '_',
  remove: /[*+~.()'"!:@]/g,
  lower: true,
  strict: true,
});
```

#### `truncateText(text, length, options?)`

Truncate text with smart word boundaries.

```typescript
import { truncateText } from '@adopt-dont-shop/lib-utils';

truncateText('This is a long description that needs truncating', 20);
// 'This is a long...'

// With options
truncateText(text, 20, {
  ending: ' [more]',
  breakWords: false,
  preserveWords: true,
});
```

#### `capitalizeText(text, options?)`

Capitalize text with various strategies.

```typescript
import { capitalizeText } from '@adopt-dont-shop/lib-utils';

capitalizeText('hello world'); // 'Hello World'
capitalizeText('HELLO WORLD', { type: 'sentence' }); // 'Hello world'
capitalizeText('hello-world', { type: 'kebab' }); // 'Hello-World'
capitalizeText('hello_world', { type: 'snake' }); // 'Hello_World'
```

### Number and Currency Utilities

#### `formatCurrency(amount, currency?, locale?)`

Format currency values with localization support.

```typescript
import { formatCurrency } from '@adopt-dont-shop/lib-utils';

formatCurrency(250); // '$250.00'
formatCurrency(250, 'EUR'); // '€250.00'
formatCurrency(250, 'USD', 'en-US'); // '$250.00'
formatCurrency(250.99, 'GBP', 'en-GB'); // '£250.99'

// Crypto currencies
formatCurrency(0.05, 'BTC'); // '₿0.05000000'
```

#### `formatNumber(number, options?)`

Format numbers with various options.

```typescript
import { formatNumber } from '@adopt-dont-shop/lib-utils';

formatNumber(1234567.89); // '1,234,567.89'
formatNumber(0.1234, { precision: 2 }); // '0.12'
formatNumber(1234567, { compact: true }); // '1.2M'
formatNumber(0.75, { style: 'percent' }); // '75%'
```

#### `parseNumber(value, options?)`

Parse strings to numbers with validation.

```typescript
import { parseNumber } from '@adopt-dont-shop/lib-utils';

parseNumber('123.45'); // 123.45
parseNumber('$250.00'); // 250
parseNumber('75%'); // 0.75
parseNumber('1,234.56'); // 1234.56

// With validation
parseNumber('123', { min: 0, max: 1000, integer: true }); // 123
```

### Array and Object Utilities

#### `groupBy(array, key)`

Group array items by a property or function.

```typescript
import { groupBy } from '@adopt-dont-shop/lib-utils';

const pets = [
  { name: 'Buddy', species: 'dog', age: 3 },
  { name: 'Whiskers', species: 'cat', age: 2 },
  { name: 'Max', species: 'dog', age: 5 },
];

const bySpecies = groupBy(pets, 'species');
// { dog: [...], cat: [...] }

const byAgeGroup = groupBy(pets, pet => (pet.age < 3 ? 'young' : 'adult'));
// { young: [...], adult: [...] }
```

#### `sortBy(array, key, order?)`

Sort arrays by property or function.

```typescript
import { sortBy } from '@adopt-dont-shop/lib-utils';

const pets = [
  { name: 'Buddy', age: 3 },
  { name: 'Max', age: 1 },
  { name: 'Luna', age: 5 },
];

sortBy(pets, 'age'); // Sorted by age ascending
sortBy(pets, 'name', 'desc'); // Sorted by name descending
sortBy(pets, pet => pet.age * -1); // Custom sort function
```

#### `deepMerge(target, ...sources)`

Deep merge objects with nested property support.

```typescript
import { deepMerge } from '@adopt-dont-shop/lib-utils';

const base = { user: { name: 'John', settings: { theme: 'dark' } } };
const updates = { user: { age: 30, settings: { language: 'en' } } };

const merged = deepMerge(base, updates);
// { user: { name: 'John', age: 30, settings: { theme: 'dark', language: 'en' } } }
```

#### `pick(object, keys)`

Pick specific properties from an object.

```typescript
import { pick } from '@adopt-dont-shop/lib-utils';

const user = { id: 1, name: 'John', email: 'john@example.com', password: 'secret' };
const publicData = pick(user, ['id', 'name', 'email']);
// { id: 1, name: 'John', email: 'john@example.com' }
```

#### `omit(object, keys)`

Omit specific properties from an object.

```typescript
import { omit } from '@adopt-dont-shop/lib-utils';

const user = { id: 1, name: 'John', email: 'john@example.com', password: 'secret' };
const safeData = omit(user, ['password']);
// { id: 1, name: 'John', email: 'john@example.com' }
```

### Function Utilities

#### `debounce(func, delay, options?)`

Debounce function execution.

```typescript
import { debounce } from '@adopt-dont-shop/lib-utils';

const searchPets = debounce(query => {
  // API call
}, 300);

// With options
const debouncedSave = debounce(saveFunction, 1000, {
  leading: false,
  trailing: true,
  maxWait: 5000,
});
```

#### `throttle(func, delay, options?)`

Throttle function execution.

```typescript
import { throttle } from '@adopt-dont-shop/lib-utils';

const handleScroll = throttle(() => {
  // Handle scroll event
}, 100);

window.addEventListener('scroll', handleScroll);
```

#### `retry(func, options?)`

Retry function execution with exponential backoff.

```typescript
import { retry } from '@adopt-dont-shop/lib-utils';

const apiCall = () => fetch('/api/data');

const result = await retry(apiCall, {
  retries: 3,
  delay: 1000,
  backoff: 'exponential',
  shouldRetry: error => error.status >= 500,
});
```

### ID and Token Generation

#### `generateId(prefix?, options?)`

Generate unique IDs with various formats.

```typescript
import { generateId } from '@adopt-dont-shop/lib-utils';

generateId(); // 'xyz123abc'
generateId('pet'); // 'pet_xyz123abc'
generateId('user', { length: 16 }); // 'user_1234567890abcdef'

// UUID format
generateId('order', { format: 'uuid' }); // 'order_f47ac10b-58cc-4372-a567-0e02b2c3d479'

// Timestamp-based
generateId('session', { includeTimestamp: true }); // 'session_1642234567_abc123'
```

#### `generateToken(options?)`

Generate secure tokens for authentication and verification.

```typescript
import { generateToken } from '@adopt-dont-shop/lib-utils';

generateToken(); // Secure random token
generateToken({ length: 32 }); // 32-character token
generateToken({ type: 'hex' }); // Hexadecimal token
generateToken({ type: 'base64' }); // Base64 token
```

### Environment and Configuration

#### `getEnvironment()`

Get current environment information.

```typescript
import { getEnvironment } from '@adopt-dont-shop/lib-utils';

const env = getEnvironment();
// {
//   isDevelopment: true,
//   isProduction: false,
//   isTest: false,
//   nodeEnv: 'development',
//   platform: 'browser' | 'node'
// }
```

#### `loadConfig(defaults?, overrides?)`

Load and merge configuration from various sources.

```typescript
import { loadConfig } from '@adopt-dont-shop/lib-utils';

const config = loadConfig(
  {
    apiUrl: 'http://localhost:3000',
    timeout: 5000,
  },
  {
    apiUrl: process.env.API_URL,
  }
);
```

### Error Handling

#### `createError(message, options?)`

Create structured error objects.

```typescript
import { createError } from '@adopt-dont-shop/lib-utils';

throw createError('Validation failed', {
  code: 'VALIDATION_ERROR',
  status: 400,
  details: { field: 'email', reason: 'invalid format' },
});
```

#### `isError(value, type?)`

Check if a value is an error of specific type.

```typescript
import { isError } from '@adopt-dont-shop/lib-utils';

isError(new Error()); // true
isError(new TypeError(), 'TypeError'); // true
isError('string'); // false
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Date and time utilities
- ✅ Validation functions
- ✅ String manipulation
- ✅ Number formatting
- ✅ Array and object operations
- ✅ Function utilities (debounce, throttle)
- ✅ ID generation and tokens
- ✅ Error handling

Run tests:

```bash
npm run test:lib-utils
```

## 🚀 Key Features

### Comprehensive Validation

- **Email Validation**: RFC 5322 compliant email validation
- **Phone Validation**: International phone number support
- **URL Validation**: Protocol and domain validation
- **Custom Rules**: Flexible validation rule engine

### Smart Formatting

- **Date Formatting**: Timezone-aware date/time formatting
- **Currency Support**: Multi-currency with localization
- **Number Formatting**: Compact notation and percentage support
- **Text Processing**: Sanitization, truncation, and capitalization

### Performance Utilities

- **Debouncing**: Prevent excessive function calls
- **Throttling**: Rate-limit function execution
- **Retry Logic**: Automatic retry with backoff strategies
- **Memoization**: Cache function results for performance

### Data Manipulation

- **Array Processing**: Grouping, sorting, and filtering
- **Object Operations**: Deep merging, picking, and omitting
- **Type Checking**: Comprehensive type validation
- **ID Generation**: Secure unique identifier creation

## 🔧 Troubleshooting

### Common Issues

**Date formatting issues**:

- Check timezone settings and locale support
- Verify date input format and validity
- Review format string patterns

**Validation not working**:

- Check validation rules and input format
- Verify regex patterns and edge cases
- Review custom validator functions

**Performance concerns**:

- Use debouncing for user input handlers
- Implement throttling for scroll/resize events
- Consider memoization for expensive computations

### Debug Mode

Most utilities include optional logging for debugging:

```typescript
import { debugMode } from '@adopt-dont-shop/lib-utils';

debugMode.enable(); // Enable debug logging for all utilities
```

This library provides essential utility functions optimized for modern web applications with comprehensive type safety, performance optimization, and extensive testing coverage.
