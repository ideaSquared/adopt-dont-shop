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

const renderWidget = (
  widget: ReportRendererWidget,
  widgetData: unknown,
  state: { isLoading?: boolean; error?: Error | null; onClick?: () => void }
): React.ReactNode => {
  switch (widget.chartType) {
    case 'line': {
      const opts = widget.options as {
        xKey: string;
        series: Array<{ key: string; label: string; color?: string }>;
        showLegend?: boolean;
      };
      const rows = coerceArray(widgetData, 'adoptionTrends', 'trends', 'data');
      return (
        <LineChart
          title={widget.title}
          data={rows}
          xKey={opts.xKey}
          series={opts.series}
          showLegend={opts.showLegend}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onClick={state.onClick}
        />
      );
    }
    case 'bar': {
      const opts = widget.options as {
        xKey: string;
        series: Array<{ key: string; label: string; color?: string }>;
        stacked?: boolean;
      };
      const rows = coerceArray(widgetData, 'trends', 'data', 'breakdown');
      return (
        <BarChart
          title={widget.title}
          data={rows}
          xKey={opts.xKey}
          series={opts.series}
          stacked={opts.stacked}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onClick={state.onClick}
        />
      );
    }
    case 'area': {
      const opts = widget.options as {
        xKey: string;
        series: Array<{ key: string; label: string; color?: string }>;
        stacked?: boolean;
      };
      const rows = coerceArray(widgetData, 'trends', 'data');
      return (
        <AreaChart
          title={widget.title}
          data={rows}
          xKey={opts.xKey}
          series={opts.series}
          stacked={opts.stacked}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onClick={state.onClick}
        />
      );
    }
    case 'pie': {
      const opts = widget.options as { labelKey: string; valueKey: string; donut?: boolean };
      const rows = coerceArray(widgetData, 'popularPetTypes', 'breakdown', 'data');
      return (
        <PieChart
          title={widget.title}
          data={rows}
          labelKey={opts.labelKey}
          valueKey={opts.valueKey}
          donut={opts.donut}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onClick={state.onClick}
        />
      );
    }
    case 'table': {
      const opts = widget.options as {
        columns: Array<{ key: string; label: string }>;
        pageSize?: number;
      };
      const rows = coerceArray(widgetData, 'rescuePerformance', 'data', 'rows');
      return (
        <DataTable
          title={widget.title}
          columns={opts.columns}
          rows={rows}
          pageSize={opts.pageSize}
          isLoading={state.isLoading}
          error={state.error ?? null}
          onRowClick={state.onClick ? () => state.onClick!() : undefined}
        />
      );
    }
    case 'metric-card': {
      const opts = widget.options as {
        valueKey: string;
        label: string;
        format?: 'number' | 'percent' | 'currency' | 'duration';
        delta?: { previousKey: string; inverted?: boolean };
      };
      const value = numericValue(widgetData, opts.valueKey);
      const previous = opts.delta ? numericValue(widgetData, opts.delta.previousKey) : undefined;
      const delta =
        opts.delta && previous !== undefined && previous !== 0
          ? (value - previous) / previous
          : undefined;
      return (
        <MetricCard
          label={opts.label}
          value={value}
          delta={delta}
          deltaInverted={opts.delta?.inverted}
          format={opts.format}
        />
      );
    }
    default:
      return null;
  }
};
