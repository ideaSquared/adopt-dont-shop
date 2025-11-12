# @adopt-dont-shop/lib-moderation

Content moderation and reporting functionality for Adopt Don't Shop platform.

## Features

- Type-safe moderation report models with Zod validation
- API service for interacting with moderation endpoints
- React hooks for fetching and managing moderation data
- Utilities for formatting and displaying moderation information

## Installation

```bash
npm install @adopt-dont-shop/lib-moderation
```

## Usage

### Types and Schemas

```typescript
import { ReportSchema, type Report } from '@adopt-dont-shop/lib-moderation';

// Validate report data
const report = ReportSchema.parse(data);
```

### API Service

```typescript
import { moderationService } from '@adopt-dont-shop/lib-moderation';

// Fetch reports
const reports = await moderationService.getReports({
  status: 'pending',
  page: 1,
  limit: 20,
});

// Take moderation action
await moderationService.takeAction(reportId, {
  actionType: 'warning_issued',
  reason: 'Violation of community guidelines',
});
```

### React Hooks

```typescript
import { useReports, useReportDetail } from '@adopt-dont-shop/lib-moderation';

function ModerationDashboard() {
  const {
    data: reports,
    isLoading,
    error,
  } = useReports({
    status: 'pending',
  });

  // ... render component
}
```

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Build
npm run build

# Type check
npm run type-check
```

## License

MIT
