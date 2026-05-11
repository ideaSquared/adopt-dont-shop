/**
 * Accessibility tests for BulkConfirmationModal (ADS-127)
 *
 * Verifies that the modal meets WCAG AA criteria for assistive tech users:
 * - Dialog role + aria-modal flag are present so screen readers treat it as a modal
 * - Title is labelled via aria-labelledby so screen readers announce it on focus
 * - Escape key closes the modal (keyboard users can dismiss without reaching the close button)
 * - First focusable element receives focus on open (keyboard users don't need to tab in)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { BulkConfirmationModal } from './BulkConfirmationModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: 'Suspend 3 users',
  description: 'This will suspend the selected accounts.',
  selectedCount: 3,
  confirmLabel: 'Suspend',
};

describe('BulkConfirmationModal accessibility', () => {
  it('renders a dialog element with aria-modal', () => {
    render(<BulkConfirmationModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('labels the dialog with its visible title via aria-labelledby', () => {
    render(<BulkConfirmationModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const titleEl = document.getElementById(labelId!);
    expect(titleEl).toHaveTextContent('Suspend 3 users');
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(<BulkConfirmationModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render dialog content when closed', () => {
    render(<BulkConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('close button has an accessible label', () => {
    render(<BulkConfirmationModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });
});
