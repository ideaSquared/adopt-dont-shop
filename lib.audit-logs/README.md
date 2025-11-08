# @adopt-dont-shop/lib-audit-logs

Audit logs service for the Adopt Don't Shop platform. Provides type-safe access to audit log data with filtering, pagination, and date range support.

## Installation

```bash
npm install @adopt-dont-shop/lib-audit-logs
```

## Usage

### Basic Usage

```typescript
import { AuditLogsService } from '@adopt-dont-shop/lib-audit-logs';

// Fetch audit logs with default 7-day date range
const response = await AuditLogsService.getAuditLogs();

console.log(response.data); // Array of audit logs
console.log(response.pagination); // Pagination info
```

### With Filters

```typescript
import { AuditLogsService, AuditLogLevel, AuditLogStatus } from '@adopt-dont-shop/lib-audit-logs';

const response = await AuditLogsService.getAuditLogs({
  action: 'LOGIN',
  userId: 'user-123',
  level: AuditLogLevel.INFO,
  status: AuditLogStatus.SUCCESS,
  startDate: '2025-01-01T00:00:00Z',
  endDate: '2025-01-07T23:59:59Z',
  page: 1,
  limit: 50,
});
```

### Available Filters

- `action` (string): Filter by action type (e.g., 'LOGIN', 'CREATE', 'UPDATE')
- `userId` (string): Filter by user who performed the action
- `entity` (string): Filter by entity/category type
- `level` (AuditLogLevel): Filter by log level ('INFO', 'WARNING', 'ERROR')
- `status` (AuditLogStatus): Filter by operation status ('success', 'failure')
- `startDate` (string): ISO date string for range start (defaults to 7 days ago)
- `endDate` (string): ISO date string for range end (defaults to now)
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Records per page (default: 50)

## Types

### AuditLog

```typescript
type AuditLog = {
  id: number;
  service: string;
  user: string | null;
  userName: string | null;
  userEmail: string | null;
  userType: string | null;
  action: string;
  level: AuditLogLevel;
  status: AuditLogStatus | null;
  timestamp: Date;
  metadata: {
    entity?: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  } | null;
  category: string;
  ip_address: string | null;
  user_agent: string | null;
};
```

### AuditLogLevel

```typescript
enum AuditLogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}
```

### AuditLogStatus

```typescript
enum AuditLogStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}
```

## Default Behavior

- **Date Range**: Defaults to the last 7 days if not specified
- **Pagination**: 50 records per page by default
- **Sorting**: Results are sorted by timestamp (newest first)

## Testing

```bash
npm run test
```

## Development

```bash
npm run dev  # Watch mode
npm run build
```
