import { z } from 'zod';

/**
 * ADS-105: Zod schemas for the analytics report builder.
 *
 * Single source of truth for the shape of `saved_reports.config` and
 * related request/response payloads. Both controller-side validation
 * (via middleware/zod-validate.ts) and the report execution engine
 * pull types off of these. The frontend `lib.analytics` mirrors the
 * same shape; consumers should keep the two in sync.
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

/** Filters applied to every widget unless the widget overrides. */
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

/**
 * Discriminated by chartType so widget-options misconfiguration is a
 * compile-time error and a 400 at runtime.
 */
export const reportWidgetSchema = z.discriminatedUnion('chartType', [
  widgetBase.extend({
    chartType: z.literal('line'),
    options: z.object({
      xKey: z.string().min(1),
      series: z
        .array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            color: z.string().optional(),
          })
        )
        .min(1)
        .max(8),
      showLegend: z.boolean().optional(),
    }),
  }),
  widgetBase.extend({
    chartType: z.literal('bar'),
    options: z.object({
      xKey: z.string().min(1),
      series: z
        .array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            color: z.string().optional(),
          })
        )
        .min(1)
        .max(8),
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
      series: z
        .array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            color: z.string().optional(),
          })
        )
        .min(1)
        .max(6),
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

// — Request/response shapes —

export const createSavedReportSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  templateId: z.string().uuid().optional(),
  rescueId: z.string().uuid().nullable().optional(),
  config: reportConfigSchema,
});

export const updateSavedReportSchema = createSavedReportSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const executeReportRequestSchema = z.object({
  config: reportConfigSchema,
});

export const cronStringSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^(\S+\s+){4}\S+$/, 'Cron expression must have 5 space-separated fields');

export const upsertScheduleSchema = z.object({
  cron: cronStringSchema,
  timezone: z.string().min(1).max(64).default('UTC'),
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        userId: z.string().uuid().optional(),
      })
    )
    .min(1)
    .max(50),
  format: z.enum(['pdf', 'csv', 'inline-html']).default('pdf'),
  isEnabled: z.boolean().default(true),
});

export const createShareSchema = z.discriminatedUnion('shareType', [
  z.object({
    shareType: z.literal('user'),
    sharedWithUserId: z.string().uuid(),
    permission: z.enum(['view', 'edit']).default('view'),
  }),
  z.object({
    shareType: z.literal('token'),
    permission: z.literal('view'),
    expiresAt: z.coerce.date(),
  }),
]);

export const drillDownRequestSchema = z.object({
  widgetId: z.string().uuid(),
  dimensionValue: z.string().min(1).max(255),
  filters: reportFiltersSchema.optional(),
});

export const reportIdParamSchema = z.object({
  id: z.string().uuid(),
});
