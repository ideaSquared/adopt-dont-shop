import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import Reports from './Reports';

const mockUseReports = vi.fn();
const mockUseReportTemplates = vi.fn();

vi.mock('@adopt-dont-shop/lib.analytics', () => ({
  useReports: () => mockUseReports(),
  useReportTemplates: () => mockUseReportTemplates(),
}));

const loaded = <T,>(data: T) => ({ data, isLoading: false, isError: false });

describe('Reports', () => {
  beforeEach(() => {
    mockUseReports.mockReturnValue(loaded([]));
    mockUseReportTemplates.mockReturnValue(loaded([]));
  });

  it('shows the page title and a link to create a report', () => {
    renderWithProviders(<Reports />);

    expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new report/i })).toHaveAttribute(
      'href',
      '/reports/new'
    );
  });

  it('lists saved reports with their scope', () => {
    mockUseReports.mockReturnValue(
      loaded([
        {
          saved_report_id: 'r1',
          name: 'Weekly adoptions',
          description: 'Adoptions per week',
          rescue_id: null,
        },
        { saved_report_id: 'r2', name: 'Rescue intake', description: null, rescue_id: 'rescue-1' },
      ])
    );

    renderWithProviders(<Reports />);

    expect(screen.getByRole('link', { name: /weekly adoptions/i })).toHaveAttribute(
      'href',
      '/reports/r1'
    );
    expect(screen.getByText('Platform scope')).toBeInTheDocument();
    expect(screen.getByText('Rescue scope')).toBeInTheDocument();
  });

  it('prompts to start from a template when nothing is saved', () => {
    renderWithProviders(<Reports />);

    expect(screen.getByText(/haven't saved any reports yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no templates available/i)).toBeInTheDocument();
  });

  it('tells the user when reports fail to load', () => {
    mockUseReports.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    renderWithProviders(<Reports />);

    expect(screen.getByText('Failed to load reports.')).toBeInTheDocument();
  });

  it('links each template to the builder pre-filled', () => {
    mockUseReportTemplates.mockReturnValue(
      loaded([{ template_id: 't1', name: 'Funnel', description: null, category: 'adoption' }])
    );

    renderWithProviders(<Reports />);

    expect(screen.getByRole('link', { name: /funnel/i })).toHaveAttribute(
      'href',
      '/reports/new?template=t1'
    );
    expect(screen.getByText('adoption report')).toBeInTheDocument();
  });
});
