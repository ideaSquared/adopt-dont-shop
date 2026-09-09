import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import type { SavedReport, ReportTemplate, ReportConfig } from '@adopt-dont-shop/lib.analytics';

const { useReportsMock, useReportTemplatesMock } = vi.hoisted(() => ({
  useReportsMock: vi.fn(),
  useReportTemplatesMock: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib.analytics', () => ({
  useReports: useReportsMock,
  useReportTemplates: useReportTemplatesMock,
}));

import ReportsPage from './Reports';

const reportConfig: ReportConfig = {
  filters: {},
  layout: { columns: 2 },
  widgets: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Total adoptions',
      position: { x: 0, y: 0, w: 4, h: 4 },
      metric: 'adoption',
      chartType: 'metric-card',
      options: { valueKey: 'total', label: 'Total adoptions' },
    },
  ],
};

const savedReport: SavedReport = {
  saved_report_id: 'r1',
  user_id: 'u1',
  rescue_id: 'rescue-1',
  template_id: null,
  name: 'Monthly adoptions',
  description: null,
  config: reportConfig,
  is_archived: false,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

const template: ReportTemplate = {
  template_id: 't1',
  name: 'Adoptions overview',
  description: 'A pre-built overview of adoption trends.',
  category: 'adoption',
  config: reportConfig,
  is_system: true,
  rescue_id: null,
};

describe('Rescue ReportsPage', () => {
  it('shows a loading state while reports are fetching', () => {
    useReportsMock.mockReturnValue({ isLoading: true, data: undefined });
    useReportTemplatesMock.mockReturnValue({ isLoading: false, data: [] });

    renderWithProviders(<ReportsPage />);

    expect(screen.getByRole('heading', { name: 'Reports', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the empty-state prompt when there are no saved reports', () => {
    useReportsMock.mockReturnValue({ isLoading: false, data: [] });
    useReportTemplatesMock.mockReturnValue({ isLoading: false, data: [] });

    renderWithProviders(<ReportsPage />);

    expect(screen.getByText(/no saved reports yet/i)).toBeInTheDocument();
  });

  it('lists saved reports and templates returned by the hooks', () => {
    useReportsMock.mockReturnValue({ isLoading: false, data: [savedReport] });
    useReportTemplatesMock.mockReturnValue({ isLoading: false, data: [template] });

    renderWithProviders(<ReportsPage />);

    expect(screen.getByRole('link', { name: /monthly adoptions/i })).toHaveAttribute(
      'href',
      '/reports/r1'
    );
    expect(screen.getByRole('link', { name: /adoptions overview/i })).toHaveAttribute(
      'href',
      '/reports/new?template=t1'
    );
    expect(screen.getByText('A pre-built overview of adoption trends.')).toBeInTheDocument();
  });

  it('links "New report" to the report builder', () => {
    useReportsMock.mockReturnValue({ isLoading: false, data: [] });
    useReportTemplatesMock.mockReturnValue({ isLoading: false, data: [] });

    renderWithProviders(<ReportsPage />);

    expect(screen.getByRole('link', { name: /new report/i })).toHaveAttribute(
      'href',
      '/reports/new'
    );
  });
});
