import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import { toast } from '@adopt-dont-shop/lib.components';
import type { AdminRescue } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import { SendEmailModal } from './SendEmailModal';

vi.mock('@/services/rescueService', () => ({
  rescueService: { sendEmail: vi.fn() },
}));

const rescue = {
  rescueId: 'rescue-1',
  name: 'Happy Paws',
  email: 'hello@happypaws.test',
} as AdminRescue; // test fixture: only the fields the modal renders

const renderModal = () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(<SendEmailModal isOpen rescue={rescue} onClose={onClose} onSuccess={onSuccess} />);
  return { onClose, onSuccess };
};

describe('SendEmailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rescueService.sendEmail).mockResolvedValue(undefined);
  });

  it('keeps Send disabled until a template is chosen', () => {
    renderModal();

    expect(screen.getByRole('button', { name: 'Send Email' })).toBeDisabled();
  });

  it('sends the chosen template, toasts, then reports success and closes', async () => {
    const { onClose, onSuccess } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Welcome Email/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(rescueService.sendEmail).toHaveBeenCalledWith('rescue-1', {
      templateId: 'tmpl_rescue_welcome_001',
    });
    expect(toast.success).toHaveBeenCalledWith('Email sent successfully!');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requires a subject and message for a custom email', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Custom Email/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Subject and body are required for custom emails'
    );
    expect(rescueService.sendEmail).not.toHaveBeenCalled();
  });

  it('sends a trimmed custom email', async () => {
    const { onSuccess } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Custom Email/ }));
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: ' Hello ' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: ' Welcome aboard ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(rescueService.sendEmail).toHaveBeenCalledWith('rescue-1', {
      subject: 'Hello',
      body: 'Welcome aboard',
    });
  });

  it('shows the failure and stays open when sending fails', async () => {
    vi.mocked(rescueService.sendEmail).mockRejectedValue(new Error('SMTP down'));
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Welcome Email/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('SMTP down');
    expect(onClose).not.toHaveBeenCalled();
  });
});
