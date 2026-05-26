import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { BulkModerationModal } from './BulkModerationModal';
import type { BulkModerationModalProps } from './BulkModerationModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps: BulkModerationModalProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  kind: 'dismiss',
  selectedCount: 3,
  selectedSeverities: ['low', 'medium'],
  isLoading: false,
  resultSummary: null,
};

const renderModal = (overrides: Partial<BulkModerationModalProps> = {}) => {
  const props = { ...defaultProps, ...overrides };
  return renderWithProviders(<BulkModerationModal {...props} />);
};

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BulkModerationModal', () => {
  describe('rendering', () => {
    it('renders nothing when not open', () => {
      const { container } = renderModal({ isOpen: false });

      expect(container.innerHTML).toBe('');
    });

    it('shows the correct title for dismiss kind', () => {
      renderModal({ kind: 'dismiss' });

      expect(screen.getByText('Bulk Dismiss Reports')).toBeInTheDocument();
    });

    it('shows the correct title for sanction kind', () => {
      renderModal({ kind: 'sanction' });

      expect(screen.getByText('Bulk Sanction Reports')).toBeInTheDocument();
    });

    it('displays the selected count', () => {
      renderModal({ selectedCount: 5 });

      expect(screen.getByTestId('bulk-selected-count')).toHaveTextContent('5 reports selected');
    });

    it('uses singular form for a single report', () => {
      renderModal({ selectedCount: 1 });

      expect(screen.getByTestId('bulk-selected-count')).toHaveTextContent('1 report selected');
    });
  });

  describe('severity warning', () => {
    it('shows a typed confirm field for critical severity reports', () => {
      renderModal({ selectedSeverities: ['critical', 'low'] });

      expect(screen.getByTestId('severity-warning')).toBeInTheDocument();
      expect(screen.getByText(/critical severity reports selected/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type.*CONFIRM.*to proceed/i)).toBeInTheDocument();
    });

    it('shows a typed confirm field for high severity reports', () => {
      renderModal({ selectedSeverities: ['high'] });

      expect(screen.getByTestId('severity-warning')).toBeInTheDocument();
      expect(screen.getByText(/high severity reports selected/i)).toBeInTheDocument();
    });

    it('does not show typed confirm for low/medium severity', () => {
      renderModal({ selectedSeverities: ['low', 'medium'] });

      expect(screen.queryByTestId('severity-warning')).not.toBeInTheDocument();
    });
  });

  describe('sanction-specific fields', () => {
    it('shows sanction type and severity dropdowns for sanction kind', () => {
      renderModal({ kind: 'sanction' });

      expect(screen.getByLabelText(/sanction type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sanction severity/i)).toBeInTheDocument();
    });

    it('does not show sanction fields for dismiss kind', () => {
      renderModal({ kind: 'dismiss' });

      expect(screen.queryByLabelText(/sanction type/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/sanction severity/i)).not.toBeInTheDocument();
    });

    it('provides the correct sanction type options', () => {
      renderModal({ kind: 'sanction' });

      const select = screen.getByLabelText(/sanction type/i);
      const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent);

      expect(options).toEqual([
        'Issue Warning',
        'Restrict Account',
        'Suspend User',
        'Ban User Permanently',
      ]);
    });
  });

  describe('form submission', () => {
    it('submits dismiss data with reason', async () => {
      const onSubmit = vi.fn();
      renderModal({ kind: 'dismiss', onSubmit });

      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/shared reason/i), 'Duplicate reports');
      await user.click(screen.getByRole('button', { name: /dismiss reports/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          kind: 'dismiss',
          reason: 'Duplicate reports',
        });
      });
    });

    it('submits sanction data with reason and sanction details', async () => {
      const onSubmit = vi.fn();
      renderModal({ kind: 'sanction', onSubmit });

      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/sanction type/i), 'user_suspended');
      await user.selectOptions(screen.getByLabelText(/sanction severity/i), 'high');
      await user.type(screen.getByLabelText(/shared reason/i), 'Repeated violations');
      await user.click(screen.getByRole('button', { name: /apply sanction/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          kind: 'sanction',
          reason: 'Repeated violations',
          sanction: {
            actionType: 'user_suspended',
            severity: 'high',
          },
        });
      });
    });

    it('does not submit when reason is empty', async () => {
      const onSubmit = vi.fn();
      renderModal({ kind: 'dismiss', onSubmit });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /dismiss reports/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit when typed confirm is required but not matched', async () => {
      const onSubmit = vi.fn();
      renderModal({
        kind: 'dismiss',
        selectedSeverities: ['critical'],
        onSubmit,
      });

      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/shared reason/i), 'A reason');
      await user.type(screen.getByLabelText(/type.*CONFIRM.*to proceed/i), 'WRONG');
      await user.click(screen.getByRole('button', { name: /dismiss reports/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits when typed confirm matches for high severity', async () => {
      const onSubmit = vi.fn();
      renderModal({
        kind: 'dismiss',
        selectedSeverities: ['high'],
        onSubmit,
      });

      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/shared reason/i), 'Justified action');
      await user.type(screen.getByLabelText(/type.*CONFIRM.*to proceed/i), 'CONFIRM');
      await user.click(screen.getByRole('button', { name: /dismiss reports/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          kind: 'dismiss',
          reason: 'Justified action',
        });
      });
    });
  });

  describe('loading state', () => {
    it('shows processing text when loading', () => {
      renderModal({ isLoading: true });

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('disables the cancel button when loading', () => {
      renderModal({ isLoading: true });

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('prevents closing via overlay click when loading', async () => {
      const onClose = vi.fn();
      renderModal({ isLoading: true, onClose });

      const user = userEvent.setup();
      // Click the overlay (the outermost div)
      const overlay = screen.getByRole('dialog').parentElement;
      if (overlay) {
        await user.click(overlay);
      }

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('result summary', () => {
    it('shows success count when all succeeded', () => {
      renderModal({ resultSummary: { succeeded: 3, failed: 0 } });

      const result = screen.getByTestId('bulk-result');
      expect(result).toHaveTextContent('3 succeeded');
      expect(result).not.toHaveTextContent('failed');
    });

    it('shows both succeeded and failed counts on partial failure', () => {
      renderModal({ resultSummary: { succeeded: 2, failed: 1 } });

      const result = screen.getByTestId('bulk-result');
      expect(result).toHaveTextContent('2 succeeded');
      expect(result).toHaveTextContent('1 failed');
    });

    it('shows done button instead of cancel/submit when results are shown', () => {
      renderModal({ resultSummary: { succeeded: 3, failed: 0 } });

      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /dismiss reports/i })).not.toBeInTheDocument();
    });

    it('calls onClose when done button is clicked', async () => {
      const onClose = vi.fn();
      renderModal({ resultSummary: { succeeded: 3, failed: 0 }, onClose });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /done/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('close behaviour', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when the close (X) button is clicked', async () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      const user = userEvent.setup();
      await user.click(screen.getByLabelText('Close'));

      expect(onClose).toHaveBeenCalled();
    });
  });
});
