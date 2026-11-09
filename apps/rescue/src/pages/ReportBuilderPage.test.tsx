import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../test-utils';

const hooks = vi.hoisted(() => ({
  useReport: vi.fn(),
  useReportTemplates: vi.fn(),
  useExecuteReportPreview: vi.fn(),
  useSaveReport: vi.fn(),
  useUpdateReport: vi.fn(),
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const navigateMock = vi.hoisted(() => vi.fn());
const routeParams = vi.hoisted(() => ({ id: undefined as string | undefined }));

vi.mock('@adopt-dont-shop/lib.analytics', () => hooks);
vi.mock('react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigateMock,
  useParams: () => routeParams,
}));
vi.mock('@adopt-dont-shop/lib.components', async importOriginal => ({
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.components')>()),
  toast: toastMock,
  ReportBuilder: ({ onSave }: { onSave: () => void }) => (
    <button type="button" onClick={onSave}>
      Save report
    </button>
  ),
}));

import ReportBuilderPage from './ReportBuilderPage';

const idle = { mutateAsync: vi.fn(), isPending: false, error: null };

describe('Rescue ReportBuilderPage save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams.id = undefined;
    hooks.useReport.mockReturnValue({ data: undefined });
    hooks.useReportTemplates.mockReturnValue({ data: [] });
    hooks.useExecuteReportPreview.mockReturnValue(idle);
  });

  it('toasts and navigates after creating a report', async () => {
    hooks.useSaveReport.mockReturnValue({
      ...idle,
      mutateAsync: vi.fn().mockResolvedValue({ saved_report_id: 'new-1' }),
    });
    hooks.useUpdateReport.mockReturnValue(idle);

    renderWithProviders(<ReportBuilderPage />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save report' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Report created'));
    expect(navigateMock).toHaveBeenCalledWith('/reports/new-1');
  });

  it('toasts an error and stays on the page when creating fails', async () => {
    hooks.useSaveReport.mockReturnValue({
      ...idle,
      mutateAsync: vi.fn().mockRejectedValue(new Error('boom')),
    });
    hooks.useUpdateReport.mockReturnValue(idle);

    renderWithProviders(<ReportBuilderPage />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save report' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Failed to save report'));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('toasts an error and stays on the page when updating fails', async () => {
    routeParams.id = 'r1';
    hooks.useSaveReport.mockReturnValue(idle);
    hooks.useUpdateReport.mockReturnValue({
      ...idle,
      mutateAsync: vi.fn().mockRejectedValue(new Error('boom')),
    });

    renderWithProviders(<ReportBuilderPage />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save report' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Failed to save report'));
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('toasts and navigates after updating a report', async () => {
    routeParams.id = 'r1';
    hooks.useSaveReport.mockReturnValue(idle);
    hooks.useUpdateReport.mockReturnValue({
      ...idle,
      mutateAsync: vi.fn().mockResolvedValue({}),
    });

    renderWithProviders(<ReportBuilderPage />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save report' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Report saved'));
    expect(navigateMock).toHaveBeenCalledWith('/reports/r1');
  });
});
