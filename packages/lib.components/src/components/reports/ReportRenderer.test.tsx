import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ReportRenderer, type ReportRendererWidget } from './ReportRenderer';

// Stub chart primitives so tests don't depend on canvas / recharts internals
vi.mock('../charts/LineChart', () => ({ LineChart: () => <div data-testid='line-chart' /> }));
vi.mock('../charts/BarChart', () => ({ BarChart: () => <div data-testid='bar-chart' /> }));
vi.mock('../charts/PieChart', () => ({ PieChart: () => <div data-testid='pie-chart' /> }));
vi.mock('../charts/AreaChart', () => ({ AreaChart: () => <div data-testid='area-chart' /> }));
vi.mock('../charts/MetricCard', () => ({ MetricCard: () => <div data-testid='metric-card' /> }));
vi.mock('../charts/DataTable', () => ({ DataTable: () => <div data-testid='data-table' /> }));

const baseConfig = {
  layout: { columns: 2 as const },
  widgets: [] as ReportRendererWidget[],
};

const makeWidget = (
  chartType: ReportRendererWidget['chartType'],
  options: Record<string, unknown>
): ReportRendererWidget => ({
  id: `w-${chartType}`,
  title: `Test ${chartType}`,
  chartType,
  metric: 'some-metric',
  position: { x: 0, y: 0, w: 1, h: 1 },
  options,
});

describe('ReportRenderer', () => {
  it('renders a well-formed line widget', () => {
    const widget = makeWidget('line', {
      xKey: 'date',
      series: [{ key: 'count', label: 'Count' }],
    });
    render(
      <ReportRenderer
        config={{ ...baseConfig, widgets: [widget] }}
        data={{ 'w-line': [{ date: '2026-01', count: 5 }] }}
      />
    );
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders an error state for a malformed line widget (missing xKey)', () => {
    // Missing required `xKey` field
    const widget = makeWidget('line', { series: [{ key: 'count', label: 'Count' }] });
    render(
      <ReportRenderer config={{ ...baseConfig, widgets: [widget] }} data={{ 'w-line': [] }} />
    );
    expect(screen.getByTestId('widget-error')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('renders an error state for a malformed pie widget (missing labelKey)', () => {
    const widget = makeWidget('pie', { valueKey: 'count' });
    render(<ReportRenderer config={{ ...baseConfig, widgets: [widget] }} data={{ 'w-pie': [] }} />);
    expect(screen.getByTestId('widget-error')).toBeInTheDocument();
  });

  it('renders an error state for a malformed metric-card widget (missing valueKey)', () => {
    const widget = makeWidget('metric-card', { label: 'Total' });
    render(
      <ReportRenderer
        config={{ ...baseConfig, widgets: [widget] }}
        data={{ 'w-metric-card': { total: 42 } }}
      />
    );
    expect(screen.getByTestId('widget-error')).toBeInTheDocument();
  });

  it('renders a well-formed metric-card widget', () => {
    const widget = makeWidget('metric-card', { valueKey: 'total', label: 'Total' });
    render(
      <ReportRenderer
        config={{ ...baseConfig, widgets: [widget] }}
        data={{ 'w-metric-card': { total: 99 } }}
      />
    );
    expect(screen.getByTestId('metric-card')).toBeInTheDocument();
  });

  it('renders a well-formed table widget', () => {
    const widget = makeWidget('table', {
      columns: [{ key: 'name', label: 'Name' }],
    });
    render(
      <ReportRenderer
        config={{ ...baseConfig, widgets: [widget] }}
        data={{ 'w-table': [{ name: 'Buddy' }] }}
      />
    );
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });
});
