import { z } from 'zod';

/**
 * ADS-105: Frontend Zod schemas for the analytics report builder.
 *
 * Mirrors the backend schemas in
 * `service.backend/src/schemas/reports.schema.ts`. Both files must
 * stay in sync — the backend is canonical for validation, this file
 * provides typed API responses + form validation in the builder UI.
 *
 * Per ADS-187 (lib.analytics should adopt schema-first), all new
 * report types are derived from these schemas via `z.infer`.
 */

export const reportMetricSchema = z.enum([
  'adoption',
  'application',
  'user',
  'communication',
  'platform',
  'custom',
]);
export type ReportMetric = z.infer<typeof reportMetricSchema>;

export const reportChartTypeSchema = z.enum(['line', 'bar', 'pie', 'area', 'table', 'metric-card']);
export type ReportChartType = z.infer<typeof reportChartTypeSchema>;

export const reportGroupBySchema = z.enum(['day', 'week', 'month']);
export type ReportGroupBy = z.infer<typeof reportGroupBySchema>;

export const reportFiltersSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  groupBy: reportGroupBySchema.optional(),
  rescueId: z.string().uuid().optional(),
  segment: z.record(z.string(), z.unknown()).optional(),
});
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

const widgetPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20),
});

const widgetBase = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  position: widgetPositionSchema,
  metric: reportMetricSchema,
  drilldown: z
    .object({
      enabled: z.boolean(),
      dimension: z.string().min(1).max(60),
    })
    .optional(),
});

const seriesSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  color: z.string().optional(),
});

export const reportWidgetSchema = z.discriminatedUnion('chartType', [
  widgetBase.extend({
    chartType: z.literal('line'),
    options: z.object({
      xKey: z.string().min(1),
      series: z.array(seriesSchema).min(1).max(8),
      showLegend: z.boolean().optional(),
    }),
  }),
  widgetBase.extend({
    chartType: z.literal('bar'),
    options: z.object({
      xKey: z.string().min(1),
      series: z.array(seriesSchema).min(1).max(8),
      stacked: z.boolean().optional(),
    }),
  }),
  widgetBase.extend({
    chartType: z.literal('pie'),
    options: z.object({
      labelKey: z.string().min(1),
      valueKey: z.string().min(1),
      donut: z.boolean().optional(),
    }),
  }),
  widgetBase.extend({
    chartType: z.literal('area'),
    options: z.object({
      xKey: z.string().min(1),
      series: z.array(seriesSchema).min(1).max(6),
      stacked: z.boolean().optional(),
    }),
  }),
  widgetBase.extend({
    chartType: z.literal('table'),
    options: z.object({
      columns: z
        .array(z.object({ key: z.string().min(1), label: z.string().min(1) }))
        .min(1)
        .max(20),
      pageSize: z.number().int().min(5).max(200).optional(),
    }),
  }),
  widgetBase.extend({
    chartType: z.literal('metric-card'),
    options: z.object({
      valueKey: z.string().min(1),
      label: z.string().min(1).max(100),
      format: z.enum(['number', 'percent', 'currency', 'duration']).optional(),
      delta: z
        .object({
          previousKey: z.string().min(1),
          inverted: z.boolean().optional(),
        })
        .optional(),
    }),
  }),
]);
export type ReportWidget = z.infer<typeof reportWidgetSchema>;

export const reportLayoutSchema = z.object({
  columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  rowGap: z.number().int().min(0).max(64).optional(),
});
export type ReportLayout = z.infer<typeof reportLayoutSchema>;

export const reportConfigSchema = z.object({
  filters: reportFiltersSchema,
  layout: reportLayoutSchema,
  widgets: z.array(reportWidgetSchema).min(1).max(24),
});
export type ReportConfig = z.infer<typeof reportConfigSchema>;

// API DTOs

export const savedReportSchema = z.object({
  saved_report_id: z.string().uuid(),
  user_id: z.string().uuid(),
  rescue_id: z.string().uuid().nullable(),
  template_id: z.string().uuid().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  config: reportConfigSchema,
  is_archived: z.boolean(),
  created_at: z.string().or(z.coerce.date()),
  updated_at: z.string().or(z.coerce.date()),
});
export type SavedReport = z.infer<typeof savedReportSchema>;

export const reportTemplateSchema = z.object({
  template_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.enum(['adoption', 'engagement', 'operations', 'fundraising', 'custom']),
  config: reportConfigSchema,
  is_system: z.boolean(),
  rescue_id: z.string().uuid().nullable(),
});
export type ReportTemplate = z.infer<typeof reportTemplateSchema>;

export const scheduledReportSchema = z.object({
  schedule_id: z.string().uuid(),
  saved_report_id: z.string().uuid(),
  cron: z.string(),
  timezone: z.string(),
  recipients: z.array(
    z.object({ email: z.string().email(), userId: z.string().uuid().optional() })
  ),
  format: z.enum(['pdf', 'csv', 'inline-html']),
  is_enabled: z.boolean(),
  last_run_at: z.string().nullable().or(z.coerce.date().nullable()),
  next_run_at: z.string().nullable().or(z.coerce.date().nullable()),
  last_status: z.enum(['pending', 'success', 'failed']).nullable(),
  last_error: z.string().nullable(),
});
export type ScheduledReport = z.infer<typeof scheduledReportSchema>;

export const reportShareSchema = z.object({
  share_id: z.string().uuid(),
  saved_report_id: z.string().uuid(),
  share_type: z.enum(['user', 'token']),
  shared_with_user_id: z.string().uuid().nullable(),
  permission: z.enum(['view', 'edit']),
  expires_at: z.string().nullable().or(z.coerce.date().nullable()),
  revoked_at: z.string().nullable().or(z.coerce.date().nullable()),
});
export type ReportShare = z.infer<typeof reportShareSchema>;

export const widgetResultSchema = z.object({
  id: z.string().uuid(),
  data: z.unknown(),
  meta: z.object({
    metric: z.string(),
    chartType: z.string(),
    computedAt: z.string(),
  }),
});

export const executedReportSchema = z.object({
  widgets: z.array(widgetResultSchema),
  filters: reportFiltersSchema,
  computedAt: z.string(),
  cacheHit: z.boolean(),
});
export type ExecutedReport = z.infer<typeof executedReportSchema>;
