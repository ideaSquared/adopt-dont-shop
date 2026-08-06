import { describe, it, expect, vi, beforeEach } from 'vitest';

import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';

// Mock the analytics service so the page mounts without hitting the network.
// Every metric rejects, so each section falls through to its empty state and
// the MetricCards render their zero defaults.
vi.mock('../services/analyticsService', () => ({
  analyticsService: {
    getAdoptionMetrics: vi.fn(),
    getApplicationAnalytics: vi.fn(),
    getPetPerformance: vi.fn(),
    getResponseTimeMetrics: vi.fn(),
    getStageDistribution: vi.fn(),
    exportToCSV: vi.fn(),
    exportToPDF: vi.fn(),
    emailReport: vi.fn(),
  },
}));

import { analyticsService } from '../services/analyticsService';
import Analytics from './Analytics';

describe('Analytics page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analyticsService.getAdoptionMetrics).mockRejectedValue(new Error('no data'));
    vi.mocked(analyticsService.getApplicationAnalytics).mockRejectedValue(new Error('no data'));
    vi.mocked(analyticsService.getPetPerformance).mockRejectedValue(new Error('no data'));
    vi.mocked(analyticsService.getResponseTimeMetrics).mockRejectedValue(new Error('no data'));
    vi.mocked(analyticsService.getStageDistribution).mockRejectedValue(new Error('no data'));
  });

  // D5: the shared DateRangePicker exposes labelled From/To date fields.
  it('renders the shared from/to date range picker', async () => {
    renderWithProviders(<Analytics />);

    expect(await screen.findByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  // D5: changing the range drives a refetch through the analytics service.
  it('refetches analytics when the date range changes', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => expect(analyticsService.getAdoptionMetrics).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-07-01' } });

    await waitFor(() => expect(analyticsService.getAdoptionMetrics).toHaveBeenCalledTimes(2));
  });

  // D5: preset shortcuts (restored from the old local picker) set the range and
  // drive a refetch.
  it('refetches analytics when a preset shortcut is clicked', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => expect(analyticsService.getAdoptionMetrics).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));

    await waitFor(() => expect(analyticsService.getAdoptionMetrics).toHaveBeenCalledTimes(2));
  });

  // D6: every data section uses the shared EmptyState when nothing is available.
  it('shows the shared empty state for each section when no data is available', async () => {
    renderWithProviders(<Analytics />);

    const empties = await screen.findAllByText('No data available');
    expect(empties).toHaveLength(5);
  });
});
