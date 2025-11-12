# Reports Functionality - Implementation Plan

**Status**: Not needed for MVP - Implement post-launch
**Current State**: UI skeleton exists with mocked data
**Location**: [Reports.tsx](./Reports.tsx)

---

## Overview

The Reports page currently has a complete UI skeleton with:

- 6 pre-defined report templates
- Scheduled reports UI
- Quick stats display
- Export button placeholders

**All data is currently hardcoded/mocked** - no backend integration exists.

---

## Current Report Templates (UI Only)

1. **User Activity Report** (Operational)
2. **Adoption Metrics Report** (Analytics)
3. **Rescue Performance Report** (Analytics)
4. **Platform Health Report** (Operational)
5. **Moderation Summary** (Compliance)
6. **Financial Overview** (Financial)

---

## Implementation Phases

### Phase 1: Backend Foundation

#### 1.1 Create Shared Library: `lib.reports`

**Location**: `lib.reports/`

**Files to create**:

```
lib.reports/
├── src/
│   ├── services/
│   │   ├── reports-service.ts          # Main report service
│   │   ├── report-scheduler.ts          # Scheduling logic
│   │   └── report-exporter.ts           # PDF/CSV/Excel export
│   ├── types/
│   │   ├── report.ts                    # Report types
│   │   ├── template.ts                  # Template types
│   │   └── schedule.ts                  # Scheduling types
│   ├── schemas/
│   │   ├── report-schemas.ts            # Zod schemas
│   │   └── template-schemas.ts          # Template schemas
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key Types to Define**:

```typescript
type ReportType =
  | 'user-activity'
  | 'adoption-metrics'
  | 'rescue-performance'
  | 'platform-health'
  | 'moderation-summary'
  | 'financial-overview';

type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

type ReportCategory = 'operational' | 'analytics' | 'compliance' | 'financial';

type ReportFormat = 'json' | 'pdf' | 'csv' | 'excel';

type Report = {
  reportId: string;
  type: ReportType;
  category: ReportCategory;
  title: string;
  parameters: Record<string, unknown>;
  status: ReportStatus;
  generatedBy: string;
  generatedAt: Date;
  data?: unknown;
  fileUrl?: string;
};

type ScheduledReport = {
  scheduleId: string;
  reportType: ReportType;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string;
  parameters: Record<string, unknown>;
  recipients: string[];
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  createdBy: string;
  createdAt: Date;
};

type ReportTemplate = {
  templateId: string;
  type: ReportType;
  name: string;
  description: string;
  category: ReportCategory;
  parameterSchema: ZodSchema;
  defaultParameters: Record<string, unknown>;
};
```

#### 1.2 Database Models & Migrations

**Location**: `service.backend/src/models/` and `service.backend/src/migrations/`

**Models to create**:

1. **Report.ts**

```typescript
interface ReportAttributes {
  reportId: string;
  type: ReportType;
  category: ReportCategory;
  title: string;
  parameters: object;
  status: ReportStatus;
  generatedBy: string;
  data?: object;
  fileUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

2. **ScheduledReport.ts**

```typescript
interface ScheduledReportAttributes {
  scheduleId: string;
  reportType: ReportType;
  title: string;
  frequency: string;
  cronExpression?: string;
  parameters: object;
  recipients: string[];
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

3. **ReportTemplate.ts**

```typescript
interface ReportTemplateAttributes {
  templateId: string;
  type: ReportType;
  name: string;
  description: string;
  category: ReportCategory;
  parameterSchema: object;
  defaultParameters: object;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Migrations to create**:

- `XX-create-reports.ts` - Reports table
- `XX-create-scheduled-reports.ts` - Scheduled reports table
- `XX-create-report-templates.ts` - Report templates table

**Seeders to create**:

- `XX-report-templates.ts` - Seed the 6 default templates

#### 1.3 Backend Services

**Location**: `service.backend/src/services/`

**Services to create**:

1. **report.service.ts** - Core report generation

```typescript
export class ReportService {
  static async generateReport(
    type: ReportType,
    parameters: object,
    userId: string
  ): Promise<Report>;
  static async getReportById(reportId: string): Promise<Report>;
  static async listReports(
    filters: ReportFilters,
    pagination: Pagination
  ): Promise<PaginatedResponse<Report>>;
  static async deleteReport(reportId: string): Promise<void>;
}
```

2. **report-generator.service.ts** - Template-specific generation logic

```typescript
export class ReportGeneratorService {
  static async generateUserActivityReport(params: UserActivityParams): Promise<object>;
  static async generateAdoptionMetricsReport(params: AdoptionMetricsParams): Promise<object>;
  static async generateRescuePerformanceReport(params: RescuePerformanceParams): Promise<object>;
  static async generatePlatformHealthReport(params: PlatformHealthParams): Promise<object>;
  static async generateModerationSummaryReport(params: ModerationSummaryParams): Promise<object>;
  static async generateFinancialOverviewReport(params: FinancialOverviewParams): Promise<object>;
}
```

3. **report-scheduler.service.ts** - Scheduled report management

```typescript
export class ReportSchedulerService {
  static async createScheduledReport(data: CreateScheduledReportRequest): Promise<ScheduledReport>;
  static async updateScheduledReport(
    scheduleId: string,
    updates: Partial<ScheduledReport>
  ): Promise<ScheduledReport>;
  static async deleteScheduledReport(scheduleId: string): Promise<void>;
  static async listScheduledReports(): Promise<ScheduledReport[]>;
  static async executeScheduledReport(scheduleId: string): Promise<void>;
  static async getUpcomingRuns(): Promise<ScheduledReport[]>;
}
```

4. **report-export.service.ts** - File export functionality

```typescript
export class ReportExportService {
  static async exportToPDF(report: Report): Promise<Buffer>;
  static async exportToCSV(report: Report): Promise<string>;
  static async exportToExcel(report: Report): Promise<Buffer>;
  static async saveExportedFile(
    reportId: string,
    format: ReportFormat,
    content: Buffer | string
  ): Promise<string>;
}
```

#### 1.4 API Endpoints

**Location**: `service.backend/src/controllers/report.controller.ts` and `service.backend/src/routes/report.routes.ts`

**Endpoints to implement**:

```typescript
// Report Generation & Management
POST   /api/v1/reports/generate
  Body: { type, parameters }
  Response: { reportId, status }

GET    /api/v1/reports
  Query: { page, limit, type?, status?, dateFrom?, dateTo? }
  Response: { data: Report[], pagination }

GET    /api/v1/reports/:reportId
  Response: { data: Report }

DELETE /api/v1/reports/:reportId
  Response: { success: true }

GET    /api/v1/reports/:reportId/export
  Query: { format: 'pdf' | 'csv' | 'excel' }
  Response: File download

// Templates
GET    /api/v1/reports/templates
  Response: { data: ReportTemplate[] }

GET    /api/v1/reports/templates/:type
  Response: { data: ReportTemplate }

// Scheduled Reports
POST   /api/v1/reports/scheduled
  Body: { reportType, title, frequency, parameters, recipients }
  Response: { data: ScheduledReport }

GET    /api/v1/reports/scheduled
  Response: { data: ScheduledReport[] }

GET    /api/v1/reports/scheduled/:scheduleId
  Response: { data: ScheduledReport }

PATCH  /api/v1/reports/scheduled/:scheduleId
  Body: Partial updates
  Response: { data: ScheduledReport }

DELETE /api/v1/reports/scheduled/:scheduleId
  Response: { success: true }

POST   /api/v1/reports/scheduled/:scheduleId/run
  Response: { reportId }
```

---

### Phase 2: Frontend Integration

#### 2.1 Update lib.reports with API Client

**Location**: `lib.reports/src/services/reports-service.ts`

```typescript
export class ReportsService {
  constructor(private apiService: ApiService) {}

  async generateReport(type: ReportType, parameters: object): Promise<Report>;
  async getReport(reportId: string): Promise<Report>;
  async listReports(filters?: ReportFilters): Promise<PaginatedResponse<Report>>;
  async deleteReport(reportId: string): Promise<void>;
  async exportReport(reportId: string, format: ReportFormat): Promise<Blob>;

  async getTemplates(): Promise<ReportTemplate[]>;
  async getTemplate(type: ReportType): Promise<ReportTemplate>;

  async createScheduledReport(data: CreateScheduledReportRequest): Promise<ScheduledReport>;
  async updateScheduledReport(
    scheduleId: string,
    updates: Partial<ScheduledReport>
  ): Promise<ScheduledReport>;
  async deleteScheduledReport(scheduleId: string): Promise<void>;
  async listScheduledReports(): Promise<ScheduledReport[]>;
  async runScheduledReport(scheduleId: string): Promise<Report>;
}
```

**React Query Hooks** (`lib.reports/src/hooks/`):

```typescript
// useReports.ts
export const useReports = (filters?: ReportFilters)
export const useGenerateReport = ()
export const useReport = (reportId: string)
export const useDeleteReport = ()
export const useExportReport = ()

// useReportTemplates.ts
export const useReportTemplates = ()
export const useReportTemplate = (type: ReportType)

// useScheduledReports.ts
export const useScheduledReports = ()
export const useCreateScheduledReport = ()
export const useUpdateScheduledReport = ()
export const useDeleteScheduledReport = ()
export const useRunScheduledReport = ()
```

#### 2.2 Refactor Reports.tsx

**File**: `app.admin/src/pages/Reports.tsx`

**Changes needed**:

1. **Replace hardcoded templates** with API call:

```typescript
const { data: templates, isLoading: templatesLoading } = useReportTemplates();
```

2. **Replace hardcoded scheduled reports** with API call:

```typescript
const { data: scheduledReports, isLoading: schedulesLoading } = useScheduledReports();
```

3. **Add report history section**:

```typescript
const { data: reportHistory, isLoading: historyLoading } = useReports({
  page: currentPage,
  limit: pageSize,
});
```

4. **Implement generate report flow**:

```typescript
const generateReport = useGenerateReport();

const handleGenerateReport = async (type: ReportType, parameters: object) => {
  await generateReport.mutateAsync({ type, parameters });
  // Show success message
  // Refresh report history
};
```

5. **Add report detail modal** to view generated report data

6. **Add filtering UI** for report history:
   - Filter by type
   - Filter by status
   - Filter by date range
   - Search by title

7. **Update quick stats** with real data from API

#### 2.3 Create New Components

**Components to create**:

1. **ReportBuilderModal.tsx** (`app.admin/src/components/reports/`)
   - Template selection dropdown
   - Dynamic parameter form based on template schema
   - Date range picker
   - Generate button with loading state
   - Validation and error handling

2. **ReportDetailModal.tsx**
   - Display report metadata (type, generated date, status)
   - Render report data (tables, charts)
   - Export buttons (PDF, CSV, Excel)
   - Delete report option

3. **ScheduledReportModal.tsx**
   - Create/edit scheduled report form
   - Report type selection
   - Frequency selector (daily, weekly, monthly, custom cron)
   - Time picker
   - Recipient email multi-select
   - Parameter configuration
   - Enable/disable toggle

4. **ReportHistoryTable.tsx**
   - DataTable with columns: Title, Type, Status, Generated Date, Actions
   - Click row to view details
   - Export action button per row
   - Delete action button per row

5. **ReportVisualization.tsx**
   - Component to render report data based on type
   - Charts for metrics (use recharts or similar)
   - Tables for detailed data
   - Summary cards for key metrics

#### 2.4 Update Page Layout

**New layout structure**:

```
Reports Page
├── PageHeader
│   ├── Title & Description
│   └── Actions (Refresh, Settings)
├── Quick Stats Row (3-4 cards)
├── Tabs
│   ├── Generate Reports
│   │   ├── Report Templates Grid
│   │   └── Generate Button → Opens ReportBuilderModal
│   ├── Report History
│   │   ├── FilterBar (type, status, date range)
│   │   └── ReportHistoryTable with pagination
│   └── Scheduled Reports
│       ├── Create Schedule Button
│       └── ScheduledReportsTable
│           ├── Columns: Title, Type, Frequency, Next Run, Status, Actions
│           └── Actions: Edit, Delete, Run Now
```

---

### Phase 3: Report Template Implementation

Each template needs specific data aggregation logic. Use existing services:

#### 3.1 User Activity Report

**Data Sources**:

- User.service - User counts, registrations
- Analytics.service - Login metrics, engagement
- AuditLog.service - User actions

**Metrics to include**:

- Total active users (last 7/30/90 days)
- New registrations (by date)
- User engagement (sessions, page views)
- Top active users
- User distribution by role/type
- Login frequency charts

#### 3.2 Adoption Metrics Report

**Data Sources**:

- Application.service - Application data
- Pet.service - Pet listings
- Analytics.service - Conversion metrics

**Metrics to include**:

- Total applications (submitted, approved, rejected, pending)
- Conversion funnel (view → apply → approve → adopt)
- Average time to adoption
- Success rate by rescue
- Popular pet types/breeds
- Application timeline charts

#### 3.3 Rescue Performance Report

**Data Sources**:

- Rescue.service - Rescue organization data
- Pet.service - Pet listings per rescue
- Application.service - Applications per rescue
- Rating.service - Rescue ratings

**Metrics to include**:

- Pet listings per rescue
- Applications received per rescue
- Adoption success rate
- Average response time
- Rating scores and trends
- Top performing rescues

#### 3.4 Platform Health Report

**Data Sources**:

- Analytics.service - System metrics
- AuditLog.service - Error logs
- Backend monitoring data

**Metrics to include**:

- System uptime
- API response times
- Error rates by endpoint
- Database query performance
- Active sessions
- Resource utilization trends

#### 3.5 Moderation Summary Report

**Data Sources**:

- Moderation.service - Moderation actions
- AuditLog.service - Moderation logs
- Report.service - Content reports

**Metrics to include**:

- Total moderation actions
- Flagged content by type
- Moderator activity
- Resolution times
- Action types distribution
- Trend analysis

#### 3.6 Financial Overview Report

**Data Sources**:

- Transaction data (if implemented)
- Subscription data (if implemented)
- Analytics.service - Financial metrics

**Metrics to include**:

- Revenue (if applicable)
- Transaction volume
- Payment method distribution
- Refunds/chargebacks
- Financial trends

---

### Phase 4: Advanced Features (Optional)

#### 4.1 Custom Report Builder

- Drag-and-drop metrics selector
- Custom date range
- Multiple data sources
- Save custom templates

#### 4.2 Report Sharing

- Generate shareable links with expiration
- Public/private toggle
- Embed reports in external pages

#### 4.3 Email Delivery

- Send scheduled reports via email
- HTML email templates
- Attachment options (PDF, Excel)

#### 4.4 Report Archival

- Automatic cleanup of old reports
- Archive policy configuration
- Restore from archive

#### 4.5 Dashboard Widgets

- Pin report metrics to dashboard
- Real-time widget updates
- Customizable widget layouts

#### 4.6 Comparison Reports

- Period-over-period comparison
- Year-over-year analysis
- A/B test comparisons

---

## Dependencies to Install

### Backend Dependencies

```json
{
  "dependencies": {
    "node-cron": "^3.0.3", // Scheduled job execution
    "pdfkit": "^0.14.0", // PDF generation
    "exceljs": "^4.4.0", // Excel export
    "csv-stringify": "^6.4.6" // CSV export
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11",
    "@types/pdfkit": "^0.13.4"
  }
}
```

### Frontend Dependencies

```json
{
  "dependencies": {
    "recharts": "^2.10.0", // Charts and visualizations
    "date-fns": "^3.0.0", // Date manipulation
    "react-datepicker": "^4.25.0" // Date range picker
  },
  "devDependencies": {
    "@types/react-datepicker": "^4.19.0"
  }
}
```

---

## Testing Strategy (TDD)

### Backend Tests

**Service Tests** (`service.backend/src/services/__tests__/`):

- `report.service.test.ts` - Report CRUD operations
- `report-generator.service.test.ts` - Each template generation
- `report-scheduler.service.test.ts` - Scheduling logic
- `report-export.service.test.ts` - PDF/CSV/Excel export

**API Tests** (`service.backend/src/__tests__/controllers/`):

- `report.controller.test.ts` - All API endpoints
- Test with various parameters, filters, pagination
- Test error cases (invalid parameters, not found, etc.)

**Model Tests** (`service.backend/src/models/__tests__/`):

- `Report.test.ts` - Model validation, defaults
- `ScheduledReport.test.ts` - Cron expression validation
- `ReportTemplate.test.ts` - Schema validation

### Frontend Tests

**Component Tests** (`app.admin/src/components/reports/__tests__/`):

- `ReportBuilderModal.test.tsx`
- `ReportDetailModal.test.tsx`
- `ScheduledReportModal.test.tsx`
- `ReportHistoryTable.test.tsx`
- `ReportVisualization.test.tsx`

**Page Tests** (`app.admin/src/pages/__tests__/`):

- `Reports.test.tsx` - Full page integration

**Hook Tests** (`lib.reports/src/hooks/__tests__/`):

- `useReports.test.ts`
- `useGenerateReport.test.ts`
- `useScheduledReports.test.ts`

**Service Tests** (`lib.reports/src/services/__tests__/`):

- `reports-service.test.ts` - API client methods

---

## Implementation Checklist

### Phase 1: Backend Foundation

- [ ] Create `lib.reports` package structure
- [ ] Define TypeScript types and Zod schemas
- [ ] Create database models (Report, ScheduledReport, ReportTemplate)
- [ ] Write and test migrations
- [ ] Implement `report.service.ts`
- [ ] Implement `report-generator.service.ts` for each template
- [ ] Implement `report-scheduler.service.ts`
- [ ] Implement `report-export.service.ts`
- [ ] Create API controller and routes
- [ ] Write comprehensive backend tests
- [ ] Create seeder for default templates

### Phase 2: Frontend Integration

- [ ] Add API client methods to `lib.reports`
- [ ] Create React Query hooks
- [ ] Refactor `Reports.tsx` to use real data
- [ ] Create `ReportBuilderModal.tsx`
- [ ] Create `ReportDetailModal.tsx`
- [ ] Create `ScheduledReportModal.tsx`
- [ ] Create `ReportHistoryTable.tsx`
- [ ] Create `ReportVisualization.tsx`
- [ ] Add filtering and search functionality
- [ ] Implement export download flow
- [ ] Write frontend component tests

### Phase 3: Report Templates

- [ ] Implement User Activity Report generator
- [ ] Implement Adoption Metrics Report generator
- [ ] Implement Rescue Performance Report generator
- [ ] Implement Platform Health Report generator
- [ ] Implement Moderation Summary Report generator
- [ ] Implement Financial Overview Report generator
- [ ] Test each template with real data
- [ ] Create visualizations for each report type

### Phase 4: Polish & Advanced Features

- [ ] Set up cron job scheduler
- [ ] Implement email delivery for scheduled reports
- [ ] Add report sharing functionality
- [ ] Implement archival policies
- [ ] Add dashboard widgets
- [ ] Create comparison reports
- [ ] Performance optimization
- [ ] Documentation

---

## Estimated Timeline

**Phase 1 (Backend)**: 3-4 days

- Day 1: Setup library, types, schemas, models, migrations
- Day 2: Core services (report.service, report-generator.service)
- Day 3: Scheduler, export services, API endpoints
- Day 4: Testing and refinement

**Phase 2 (Frontend)**: 2-3 days

- Day 1: API client, hooks, refactor Reports.tsx
- Day 2: Create modals and components
- Day 3: Testing and polish

**Phase 3 (Templates)**: 2-3 days

- Day 1: Implement 3 templates
- Day 2: Implement 3 templates
- Day 3: Testing and visualizations

**Phase 4 (Advanced)**: 3-5 days

- Variable based on features chosen

**Total: 10-15 days** (with comprehensive testing following TDD)

---

## Migration Path (Incremental Implementation)

Since the UI already exists, you can implement incrementally:

1. **Backend First** - Build all backend services (invisible to users)
2. **Wire One Template** - Connect User Activity Report end-to-end
3. **Test with Real Users** - Get feedback before building remaining templates
4. **Progressive Enhancement** - Enable remaining templates one by one
5. **Add Scheduling** - Implement scheduled reports last

This approach allows validating the approach before full investment.

---

## Notes & Considerations

### Security

- **Permission checks**: Only admins can generate/view reports
- **Data privacy**: Some reports may contain PII - ensure proper access controls
- **Rate limiting**: Report generation can be resource-intensive
- **File storage**: Secure storage for exported reports (S3 or similar)

### Performance

- **Async generation**: Long reports should run in background (job queue)
- **Caching**: Cache frequently requested reports
- **Pagination**: Large datasets need pagination
- **Indexing**: Proper database indexes for report queries

### Monitoring

- **Track generation times**: Monitor report performance
- **Error tracking**: Log failed report generations
- **Usage metrics**: Track which reports are most used
- **Resource usage**: Monitor database/CPU impact

### Future Enhancements

- Real-time report updates (WebSocket)
- Report subscriptions (alert on data changes)
- Collaborative reports (shared editing)
- AI-powered insights ("Report shows anomaly in...")
- Mobile app support
- API access for third-party integrations

---

## Related Files

**Current Implementation**:

- Frontend: [Reports.tsx](./Reports.tsx)
- Sidebar: [AdminSidebar.tsx](../components/layout/AdminSidebar.tsx)

**Similar Features for Reference**:

- Analytics Page: [Analytics.tsx](./Analytics.tsx) - Chart examples
- Audit Page: [Audit.tsx](./Audit.tsx) - DataTable with filters
- Users Page: [Users.tsx](./Users.tsx) - Modal patterns

**Shared Libraries to Use**:

- `lib.analytics` - Analytics service for metrics
- `lib.audit-logs` - Audit log data
- `lib.api` - API client base
- `lib.components` - Shared UI components

---

## Questions to Answer Before Implementation

1. **Data Retention**: How long should generated reports be stored?
2. **Export Storage**: Where should exported files be stored (local, S3, etc.)?
3. **Email Provider**: Which email service for scheduled report delivery?
4. **Job Queue**: Use simple cron or robust queue system (Bull, BullMQ)?
5. **Charting Library**: Recharts, Chart.js, or another option?
6. **PDF Engine**: PDFKit, Puppeteer, or another library?
7. **Access Control**: Who can create/view which reports?
8. **Rate Limits**: How many reports can a user generate per day?
9. **File Size Limits**: Maximum size for exported reports?
10. **Custom Reports**: Should users be able to create custom report templates?

---

**Last Updated**: 2025-11-08
**Next Review**: When ready to implement post-MVP
**Owner**: To be assigned
