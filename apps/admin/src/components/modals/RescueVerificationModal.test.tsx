import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import type { AdminRescue } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import { RescueVerificationModal } from './RescueVerificationModal';

vi.mock('@/services/rescueService', () => ({
  rescueService: {
    verify: vi.fn(),
    reject: vi.fn(),
  },
}));

const rescue = {
  rescueId: 'rescue-1',
  name: 'Happy Paws',
  email: 'hello@happypaws.test',
  city: 'Leeds',
  county: 'West Yorkshire',
} as AdminRescue; // test fixture: only the fields the modal renders

const submit = (action: 'approve' | 'reject') =>
  fireEvent.click(
    screen.getByRole('button', { name: action === 'approve' ? 'Approve Rescue' : 'Reject Rescue' })
  );

const renderModal = (action: 'approve' | 'reject') => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(
    <RescueVerificationModal
      rescue={rescue}
      action={action}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
  return { onClose, onSuccess };
};

describe('RescueVerificationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rescueService.verify).mockResolvedValue(rescue);
    vi.mocked(rescueService.reject).mockResolvedValue(rescue);
  });

  it('is a labelled dialog showing the rescue details', () => {
    renderModal('approve');

    expect(screen.getByRole('dialog', { name: 'Approve Rescue' })).toBeInTheDocument();
    expect(screen.getByText('Happy Paws')).toBeInTheDocument();
    expect(screen.getByText('hello@happypaws.test')).toBeInTheDocument();
    expect(screen.getByText('Leeds, West Yorkshire')).toBeInTheDocument();
  });

  it('verifies the rescue with trimmed notes, then reports success and closes', async () => {
    const { onClose, onSuccess } = renderModal('approve');

    fireEvent.change(screen.getByLabelText('Internal Notes'), {
      target: { value: ' looks good ' },
    });
    submit('approve');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(rescueService.verify).toHaveBeenCalledWith('rescue-1', {
      status: 'verified',
      notes: 'looks good',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('refuses to reject without a reason', () => {
    renderModal('reject');

    fireEvent.change(screen.getByLabelText('Rejection Reason'), { target: { value: '   ' } });
    submit('reject');

    expect(screen.getByRole('alert')).toHaveTextContent('Rejection reason is required');
    expect(rescueService.reject).not.toHaveBeenCalled();
  });

  it('rejects the rescue with the reason', async () => {
    const { onSuccess } = renderModal('reject');

    fireEvent.change(screen.getByLabelText('Rejection Reason'), {
      target: { value: ' incomplete paperwork ' },
    });
    submit('reject');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(rescueService.reject).toHaveBeenCalledWith('rescue-1', {
      status: 'rejected',
      notes: undefined,
      rejectionReason: 'incomplete paperwork',
    });
  });

  it('shows the failure and stays open when the request fails', async () => {
    vi.mocked(rescueService.verify).mockRejectedValue(new Error('Network down'));
    const { onClose, onSuccess } = renderModal('approve');

    submit('approve');

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const { onClose } = renderModal('approve');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
