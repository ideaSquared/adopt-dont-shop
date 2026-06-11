import React, { useMemo } from 'react';
import { LineChart } from '../charts/LineChart';
import { BarChart } from '../charts/BarChart';
import { PieChart } from '../charts/PieChart';
import { AreaChart } from '../charts/AreaChart';
import { MetricCard } from '../charts/MetricCard';
import { DataTable } from '../charts/DataTable';

/**
 * ADS-105: Renders a saved report configuration + executed data.
 *
 * The widget config is a discriminated union by `chartType`. We
 * pattern-match here and pass the right shape into each chart
 * primitive. Used by:
 *   - The builder's live preview
 *   - The view page (saved report viewer)
 *   - The token-share page (read-only view via signed URL)
 *
 * Widget data shapes vary by metric. The `coerceArray` helper deals
 * with the common cases (already an array, an object with a known
 * key, etc.) so the renderer remains tolerant when AnalyticsService
 * methods evolve.
 */

export type ReportRendererWidget = {
  id: string;
  title: string;
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'table' | 'metric-card';
  metric: string;
  position: { x: number; y: number; w: number; h: number };
  options: Record<string, unknown>;
  drilldown?: { enabled: boolean; dimension: string };
};

export type ReportRendererProps = {
  config: {
    layout: { columns: 1 | 2 | 3 | 4; rowGap?: number };
    widgets: ReportRendererWidget[];
  };
  /** Map of widgetId → executed data. */
  data: Record<string, unknown>;
  isLoading?: boolean;
  error?: Error | null;
  onDrilldown?: (widget: ReportRendererWidget, value: string) => void;
};

const coerceArray = (value: unknown, ...candidateKeys: string[]): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value as Record<string, unknown>[];
  }
  if (value && typeof value === 'object') {
    for (const key of candidateKeys) {
      const nested = (value as Record<string, unknown>)[key];
      if (Array.isArray(nested)) {
        return nested as Record<string, unknown>[];
      }
    }
  }
  return [];
};

const numericValue = (value: unknown, key: string): number => {
  if (value && typeof value === 'object') {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === 'number') {
      return v;
    }
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
  }
  if (typeof value === 'number') {
    return value;
  }
  return 0;
};

export const ReportRenderer: React.FC<ReportRendererProps> = ({
  config,
  data,
  isLoading,
  error,
  onDrilldown,
}) => {
  const gridStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'grid',
      gridTemplateColumns: `repeat(${config.layout.columns}, minmax(0, 1fr))`,
      gap: `${config.layout.rowGap ?? 16}px`,
      width: '100%',
    }),
    [config.layout]
  );

  return (
    <div style={gridStyle} data-testid='report-renderer'>
      {config.widgets.map(widget => {
        const widgetData = data[widget.id];
        const onClick =
          widget.drilldown?.enabled && onDrilldown
            ? () => onDrilldown(widget, widget.drilldown!.dimension)
            : undefined;
        const span = Math.min(widget.position.w, config.layout.columns);
        const cellStyle: React.CSSProperties = {
          gridColumn: `span ${span}`,
          minHeight: `${(widget.position.h ?? 1) * 110}px`,
        };
        return (
          <div key={widget.id} style={cellStyle}>
            {renderWidget(widget, widgetData, { isLoading, error, onClick })}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Guard helpers: check the required keys exist before destructuring.
 * When a required key is missing we return a small error element rather
 * than throwing an uncaught runtime error.
 */
const hasKeys = (obj: Record<string, unknown>, ...keys: string[]): boolean =>
  keys.every(k => k in obj && obj[k] !== undefined && obj[k] !== null);

const malformedWidget = (chartType: string): React.ReactNode => (
  <div
    role='alert'
    style={{ color: 'red', padding: '0.5rem', fontSize: '0.8rem' }}
    data-testid='widget-error'
  >
    Widget misconfigured: missing required options for &ldquo;{chartType}&rdquo;
  </div>
);

const renderWidget = (
  widget: ReportRendererWidget,
  widgetData: unknown,
  state: { isLoading?: boolean; error?: Error | null; onClick?: () => void }
): React.ReactNode => {
  const opts = widget.options;

  switch (widget.chartType) {
    case 'line': {
      if (!hasKeys(opts, 'xKey', 'series')) return malformedWidget('line');
      const xKey = opts.xKey as string;
      const series = opts.series as Array<{ key: string; label: string; color?: string }>;
      const showLegend = opts.showLegend as boolean | undefined;
      const rows = coerceArray(widgetData, 'adoptionTrends', 'trends', 'data');
      return (
        <LineChart
          title={widget.title}
          data={rows}
          xKey={xKey}
          series={series}
          showLegend={showLegend}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onClick={state.onClick}
        />
      );
    }
    case 'bar': {
      if (!hasKeys(opts, 'xKey', 'series')) return malformedWidget('bar');
      const xKey = opts.xKey as string;
      const series = opts.series as Array<{ key: string; label: string; color?: string }>;
      const stacked = opts.stacked as boolean | undefined;
      const rows = coerceArray(widgetData, 'trends', 'data', 'breakdown');
      return (
        <BarChart
          title={widget.title}
          data={rows}
          xKey={xKey}
          series={series}
          stacked={stacked}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onClick={state.onClick}
        />
      );
    }
    case 'area': {
      if (!hasKeys(opts, 'xKey', 'series')) return malformedWidget('area');
      const xKey = opts.xKey as string;
      const series = opts.series as Array<{ key: string; label: string; color?: string }>;
      const stacked = opts.stacked as boolean | undefined;
      const rows = coerceArray(widgetData, 'trends', 'data');
      return (
        <AreaChart
          title={widget.title}
          data={rows}
          xKey={xKey}
          series={series}
          stacked={stacked}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onClick={state.onClick}
        />
      );
    }
    case 'pie': {
      if (!hasKeys(opts, 'labelKey', 'valueKey')) return malformedWidget('pie');
      const labelKey = opts.labelKey as string;
      const valueKey = opts.valueKey as string;
      const donut = opts.donut as boolean | undefined;
      const rows = coerceArray(widgetData, 'popularPetTypes', 'breakdown', 'data');
      return (
        <PieChart
          title={widget.title}
          data={rows}
          labelKey={labelKey}
          valueKey={valueKey}
          donut={donut}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onClick={state.onClick}
        />
      );
    }
    case 'table': {
      if (!hasKeys(opts, 'columns')) return malformedWidget('table');
      const columns = opts.columns as Array<{ key: string; label: string }>;
      const pageSize = opts.pageSize as number | undefined;
      const rows = coerceArray(widgetData, 'rescuePerformance', 'data', 'rows');
      return (
        <DataTable
          title={widget.title}
          columns={columns}
          rows={rows}
          pageSize={pageSize}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onRowClick={state.onClick ? () => state.onClick?.() : undefined}
        />
      );
    }
    case 'metric-card': {
      if (!hasKeys(opts, 'valueKey', 'label')) return malformedWidget('metric-card');
      const valueKey = opts.valueKey as string;
      const label = opts.label as string;
      const format = opts.format as 'number' | 'percent' | 'currency' | 'duration' | undefined;
      const delta = opts.delta as { previousKey: string; inverted?: boolean } | undefined;
      const value = numericValue(widgetData, valueKey);
      const previous = delta ? numericValue(widgetData, delta.previousKey) : undefined;
      const deltaValue =
        delta && previous !== undefined && previous !== 0
          ? (value - previous) / previous
          : undefined;
      return (
        <MetricCard
          label={label}
          value={value}
          delta={deltaValue}
          deltaInverted={delta?.inverted}
          format={format}
        />
      );
    }
    default:
      return null;
  }
};
