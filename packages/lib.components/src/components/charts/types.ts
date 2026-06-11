/**
 * ADS-105: Common types for the chart primitives.
 *
 * Shared by LineChart / BarChart / AreaChart so the consumer can
 * switch between them by passing a `chartType` discriminant without
 * rewriting the data prop.
 */

export type ChartSeries = {
  /** Property on each datum to pull the y-value from. */
  key: string;
  /** Legend label. */
  label: string;
  /** Optional explicit hex color; otherwise a palette default is used. */
  color?: string;
};

export type ChartDatum = Record<string, unknown>;

export const PALETTE = [
  '#2563eb', // blue
  '#16a34a', // green
  '#f59e0b', // amber
  '#dc2626', // red
  '#9333ea', // purple
  '#0891b2', // cyan
  '#db2777', // pink
  '#65a30d', // lime
];
