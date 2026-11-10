import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../test-utils';

const hooks = vi.hoisted(() => ({
  useReport: vi.fn(),
  useExecuteSavedReport: vi.fn(),
  useDeleteReport: vi.fn(),
  useUpsertSchedule: vi.fn(),
  useCreateTokenShare: vi.fn(),
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@adopt-dont-shop/lib.analytics', () => hooks);
vi.mock('react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigateMock,
  useParams: () => ({ id: 'r1' }),
}));
vi.mock('@adopt-dont-shop/lib.components', async importOriginal => ({
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.components')>()),
  toast: toastMock,
  ReportRenderer: () => <div>rendered report</div>,
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true), confirmProps: {} }),
  ConfirmDialog: () => null,
}));

import ReportViewPage from './ReportViewPage';

const mutation = (mutateAsync: ReturnType<typeof vi.fn>) => ({ mutateAsync, isPending: false });
const ok = () => vi.fn().mockResolvedValue({ token: 'tok' });
const fail = () => vi.fn().mockRejectedValue(new Error('boom'));

const setup = (overrides: {
  execute?: Record<string, unknown>;
  del?: ReturnType<typeof vi.fn>;
  schedule?: ReturnType<typeof vi.fn>;
  share?: ReturnType<typeof vi.fn>;
}) => {
  hooks.useReport.mockReturnValue({
    isLoading: false,
    data: { name: 'Monthly adoptions', description: null, config: {} },
  });
  hooks.useExecuteSavedReport.mockReturnValue(
    overrides.execute ?? { isLoading: false, isError: false, data: { widgets: [] } }
  );
  hooks.useDeleteReport.mockReturnValue(mutation(overrides.del ?? ok()));
  hooks.useUpsertSchedule.mockReturnValue(mutation(overrides.schedule ?? ok()));
  hooks.useCreateTokenShare.mockReturnValue(mutation(overrides.share ?? ok()));
  renderWithProviders(<ReportViewPage />);
};

describe('Rescue ReportViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error message when the report fails to execute', () => {
    setup({ execute: { isLoading: false, isError: true, error: new Error('x'), data: undefined } });

    expect(screen.getByText('Failed to execute the report.')).toBeInTheDocument();
    expect(screen.queryByText('rendered report')).not.toBeInTheDocument();
  });

  it('toasts success and navigates after deleting', async () => {
    setup({});
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Report deleted'));
    expect(navigateMock).toHaveBeenCalledWith('/reports');
  });

  it('toasts an error and stays put when delete fails', async () => {
    setup({ del: fail() });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Failed to delete report'));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('toasts success after saving a schedule and closes the panel', async () => {
    setup({});
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Schedule' }));
    await user.type(screen.getByPlaceholderText('recipient@example.com'), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Save schedule' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Schedule saved'));
    expect(screen.queryByPlaceholderText('recipient@example.com')).not.toBeInTheDocument();
  });

  it('toasts an error and keeps the panel open when saving a schedule fails', async () => {
    setup({ schedule: fail() });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Schedule' }));
    await user.type(screen.getByPlaceholderText('recipient@example.com'), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Save schedule' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Failed to save schedule'));
    expect(screen.getByPlaceholderText('recipient@example.com')).toBeInTheDocument();
  });

  it('shows the share link and toasts success when sharing', async () => {
    setup({});
    await userEvent.setup().click(screen.getByRole('button', { name: 'Share link' }));

    expect(await screen.findByText(/\/reports\/shared\/tok/)).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith('Share link created');
  });

  it('toasts an error and shows no link when sharing fails', async () => {
    setup({ share: fail() });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Share link' }));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('Failed to create share link')
    );
    expect(screen.queryByText(/\/reports\/shared\//)).not.toBeInTheDocument();
  });
});
