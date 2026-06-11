import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import PrivacyTools from './PrivacyTools';
import { apiService } from '../services/libraryServices';

const confirmSpy = vi.fn();

vi.mock('@adopt-dont-shop/lib.components', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@adopt-dont-shop/lib.components');
  return {
    ...actual,
    useConfirm: () => ({
      isOpen: false,
      confirm: confirmSpy,
      confirmProps: {
        isOpen: false,
        onClose: () => {},
        onConfirm: () => {},
        message: '',
      },
    }),
    ConfirmDialog: () => null,
  };
});

vi.mock('../services/libraryServices', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const apiServiceMock = apiService as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('PrivacyTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmSpy.mockResolvedValue(true);
    apiServiceMock.get.mockReset();
    apiServiceMock.post.mockReset();

    // jsdom does not implement URL.createObjectURL / revokeObjectURL
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValue('blob:mock-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  const typeUserId = (value = 'user-123') => {
    const input = screen.getByPlaceholderText('UUID of the target user') as HTMLInputElement;
    fireEvent.change(input, { target: { value } });
  };

  it('renders both privacy actions', () => {
    renderWithProviders(<PrivacyTools />);
    expect(screen.getByText('Data Export (GDPR Art. 20)')).toBeInTheDocument();
    expect(screen.getByText('Account Deletion (GDPR Art. 17)')).toBeInTheDocument();
  });

  it('successfully exports user data when api call resolves', async () => {
    apiServiceMock.get.mockResolvedValue({ user: { id: 'user-123' }, data: ['record-1'] });
    renderWithProviders(<PrivacyTools />);
    typeUserId();

    fireEvent.click(screen.getByRole('button', { name: /Export user data/i }));

    await waitFor(() => {
      expect(apiServiceMock.get).toHaveBeenCalledWith(
        '/api/v1/privacy/admin/users/user-123/export'
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Export downloaded.')).toBeInTheDocument();
    });
  });

  it('shows error message when export api call fails', async () => {
    apiServiceMock.get.mockRejectedValue(new Error('Network unreachable'));
    renderWithProviders(<PrivacyTools />);
    typeUserId();

    fireEvent.click(screen.getByRole('button', { name: /Export user data/i }));

    await waitFor(() => {
      expect(screen.getByText('Network unreachable')).toBeInTheDocument();
    });
  });

  it('schedules deletion after user confirms', async () => {
    confirmSpy.mockResolvedValueOnce(true);
    apiServiceMock.post.mockResolvedValue(undefined);
    renderWithProviders(<PrivacyTools />);
    typeUserId();

    fireEvent.click(screen.getByRole('button', { name: /Schedule deletion/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'danger', title: 'Schedule account deletion?' })
      );
    });
    await waitFor(() => {
      expect(apiServiceMock.post).toHaveBeenCalledWith(
        '/api/v1/privacy/admin/users/user-123/delete-request',
        { reason: undefined }
      );
    });
    await waitFor(() => {
      expect(
        screen.getByText(
          'Deletion scheduled. Hard anonymisation runs after the 30-day grace window.'
        )
      ).toBeInTheDocument();
    });
  });

  it('does not call the delete api when user cancels the confirm dialog', async () => {
    confirmSpy.mockResolvedValueOnce(false);
    renderWithProviders(<PrivacyTools />);
    typeUserId();

    fireEvent.click(screen.getByRole('button', { name: /Schedule deletion/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
    });
    expect(apiServiceMock.post).not.toHaveBeenCalled();
  });
});
