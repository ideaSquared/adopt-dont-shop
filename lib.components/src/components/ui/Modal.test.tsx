import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider } from '../../styles/ThemeProvider';
import { lightTheme } from '../../styles/theme';
import { Modal } from './Modal';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

const MockModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title='Test Modal'>
    <p>Modal content</p>
  </Modal>
);

describe('Modal', () => {
  beforeEach(() => {
    // Clear body styles before each test
    document.body.style.overflow = '';
  });

  it('renders modal when isOpen is true', () => {
    const handleClose = jest.fn();
    renderWithTheme(<MockModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    const handleClose = jest.fn();
    renderWithTheme(<MockModal isOpen={false} onClose={handleClose} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    renderWithTheme(<MockModal isOpen={true} onClose={handleClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    renderWithTheme(<MockModal isOpen={true} onClose={handleClose} />);

    const overlay = screen.getByRole('dialog').parentElement!;
    await user.click(overlay);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when escape key is pressed', () => {
    const handleClose = jest.fn();
    renderWithTheme(<MockModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on overlay click when closeOnOverlayClick is false', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
        <p>Content</p>
      </Modal>
    );

    const overlay = screen.getByRole('dialog').parentElement!;
    await user.click(overlay);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('does not close on escape when closeOnEscape is false', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose} closeOnEscape={false}>
        <p>Content</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('applies different sizes correctly', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose} size='lg'>
        <p>Content</p>
      </Modal>
    );

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose} showCloseButton={false}>
        <p>Content</p>
      </Modal>
    );

    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose} data-testid='test-modal'>
        <p>Content</p>
      </Modal>
    );

    const modal = screen.getByTestId('test-modal');
    expect(modal).toBeInTheDocument();
  });

  it('traps focus within modal', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={handleClose}>
        <button>First button</button>
        <button>Second button</button>
      </Modal>
    );

    const firstButton = screen.getByText('First button');
    const secondButton = screen.getByText('Second button');
    const closeButton = screen.getByRole('button', { name: /close/i });

    // Focus should start on first focusable element
    firstButton.focus();

    // Tab should move to next element
    await user.tab();
    expect(secondButton).toHaveFocus();

    // Tab should move to close button
    await user.tab();
    expect(closeButton).toHaveFocus();

    // Tab should wrap to first element
    await user.tab();
    expect(firstButton).toHaveFocus();
  });

  it('prevents body scroll when modal is open', () => {
    const handleClose = jest.fn();
    renderWithTheme(<MockModal isOpen={true} onClose={handleClose} />);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when modal is closed', () => {
    const handleClose = jest.fn();
    const { rerender } = renderWithTheme(<MockModal isOpen={true} onClose={handleClose} />);

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <ThemeProvider theme={lightTheme}>
        <MockModal isOpen={false} onClose={handleClose} />
      </ThemeProvider>
    );

    expect(document.body.style.overflow).toBe('');
  });
});
