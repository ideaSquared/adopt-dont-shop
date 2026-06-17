import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AuthContext, type AuthContextType } from '../contexts/AuthContext';
import { authService } from '../services/auth-service';
import { TwoFactorSettings } from './TwoFactorSettings';
import type { User } from '../types';

vi.mock('../services/auth-service', () => ({
  authService: {
    twoFactorSetup: vi.fn(),
    twoFactorEnable: vi.fn(),
    twoFactorDisable: vi.fn(),
    twoFactorRegenerateBackupCodes: vi.fn(),
  },
}));

const baseUser: User = {
  userId: '123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  emailVerified: true,
  userType: 'adopter',
  status: 'active',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const buildAuthValue = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: baseUser,
  isAuthenticated: true,
  isLoading: false,
  isInitializing: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
});

const renderSettings = (value: AuthContextType, onStatusChange?: (enabled: boolean) => void) =>
  render(
    <AuthContext.Provider value={value}>
      <TwoFactorSettings onStatusChange={onStatusChange} />
    </AuthContext.Provider>
  );

describe('TwoFactorSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when 2FA is disabled', () => {
    it('shows the disabled status and a set-up button', () => {
      renderSettings(buildAuthValue({ user: { ...baseUser, twoFactorEnabled: false } }));

      expect(screen.getByText('Disabled')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /set up two-factor authentication/i })
      ).toBeInTheDocument();
    });

    it('moves to the scanning phase showing the QR code and secret after starting setup', async () => {
      (authService.twoFactorSetup as ReturnType<typeof vi.fn>).mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeDataUrl: 'data:image/png;base64,abc',
      });
      renderSettings(buildAuthValue({ user: { ...baseUser, twoFactorEnabled: false } }));

      await userEvent.click(
        screen.getByRole('button', { name: /set up two-factor authentication/i })
      );

      expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      expect(screen.getByAltText('2FA QR Code')).toHaveAttribute(
        'src',
        'data:image/png;base64,abc'
      );
    });

    it('surfaces an error when setup fails', async () => {
      (authService.twoFactorSetup as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Setup unavailable')
      );
      renderSettings(buildAuthValue({ user: { ...baseUser, twoFactorEnabled: false } }));

      await userEvent.click(
        screen.getByRole('button', { name: /set up two-factor authentication/i })
      );

      expect(await screen.findByText('Setup unavailable')).toBeInTheDocument();
    });
  });

  describe('verify and enable flow', () => {
    const startSetup = async () => {
      (authService.twoFactorSetup as ReturnType<typeof vi.fn>).mockResolvedValue({
        secret: 'SECRET123',
        qrCodeDataUrl: 'data:image/png;base64,qr',
      });
      await userEvent.click(
        screen.getByRole('button', { name: /set up two-factor authentication/i })
      );
      await screen.findByText('SECRET123');
    };

    it('enables 2FA, refreshes the user, shows backup codes and notifies the parent', async () => {
      const refreshUser = vi.fn();
      const onStatusChange = vi.fn();
      (authService.twoFactorEnable as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        backupCodes: ['code-a', 'code-b'],
      });
      renderSettings(
        buildAuthValue({ user: { ...baseUser, twoFactorEnabled: false }, refreshUser }),
        onStatusChange
      );

      await startSetup();
      await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
      await userEvent.click(screen.getByRole('button', { name: /verify and enable/i }));

      expect(await screen.findByText('code-a')).toBeInTheDocument();
      expect(screen.getByText('code-b')).toBeInTheDocument();
      expect(authService.twoFactorEnable).toHaveBeenCalledWith('SECRET123', '123456');
      await waitFor(() => expect(refreshUser).toHaveBeenCalled());
      expect(onStatusChange).toHaveBeenCalledWith(true);
    });

    it('shows an error when the verification code is rejected', async () => {
      (authService.twoFactorEnable as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid code')
      );
      renderSettings(buildAuthValue({ user: { ...baseUser, twoFactorEnabled: false } }));

      await startSetup();
      await userEvent.type(screen.getByPlaceholderText('000000'), '999999');
      await userEvent.click(screen.getByRole('button', { name: /verify and enable/i }));

      expect(await screen.findByText('Invalid code')).toBeInTheDocument();
    });

    it('returns to the idle screen when setup is cancelled', async () => {
      renderSettings(buildAuthValue({ user: { ...baseUser, twoFactorEnabled: false } }));

      await startSetup();
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(
        screen.getByRole('button', { name: /set up two-factor authentication/i })
      ).toBeInTheDocument();
    });

    it('dismisses the backup codes screen once the user confirms they saved them', async () => {
      (authService.twoFactorEnable as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        backupCodes: ['code-a'],
      });
      renderSettings(buildAuthValue({ user: { ...baseUser, twoFactorEnabled: false } }));

      await startSetup();
      await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
      await userEvent.click(screen.getByRole('button', { name: /verify and enable/i }));
      await screen.findByText('code-a');

      await userEvent.click(screen.getByRole('button', { name: /i have saved my backup codes/i }));

      expect(
        screen.getByRole('button', { name: /set up two-factor authentication/i })
      ).toBeInTheDocument();
    });
  });

  describe('when 2FA is enabled', () => {
    const enabledValue = (overrides: Partial<AuthContextType> = {}) =>
      buildAuthValue({ user: { ...baseUser, twoFactorEnabled: true }, ...overrides });

    it('shows the enabled status with regenerate and disable actions', () => {
      renderSettings(enabledValue());

      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /regenerate backup codes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disable 2fa/i })).toBeInTheDocument();
    });

    it('regenerates and displays new backup codes', async () => {
      (authService.twoFactorRegenerateBackupCodes as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        backupCodes: ['new-1', 'new-2'],
      });
      renderSettings(enabledValue());

      await userEvent.click(screen.getByRole('button', { name: /regenerate backup codes/i }));

      expect(await screen.findByText('new-1')).toBeInTheDocument();
      expect(screen.getByText('new-2')).toBeInTheDocument();
    });

    it('shows an error when backup code regeneration fails', async () => {
      (authService.twoFactorRegenerateBackupCodes as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Regenerate failed')
      );
      renderSettings(enabledValue());

      await userEvent.click(screen.getByRole('button', { name: /regenerate backup codes/i }));

      expect(await screen.findByText('Regenerate failed')).toBeInTheDocument();
    });

    it('disables 2FA after confirming with a code, refreshing the user and notifying the parent', async () => {
      const refreshUser = vi.fn();
      const onStatusChange = vi.fn();
      (authService.twoFactorDisable as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        message: 'disabled',
      });
      renderSettings(enabledValue({ refreshUser }), onStatusChange);

      await userEvent.click(screen.getByRole('button', { name: /disable 2fa/i }));
      await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
      await userEvent.click(screen.getByRole('button', { name: /confirm disable/i }));

      await waitFor(() => expect(authService.twoFactorDisable).toHaveBeenCalledWith('123456'));
      await waitFor(() => expect(refreshUser).toHaveBeenCalled());
      expect(onStatusChange).toHaveBeenCalledWith(false);
    });

    it('shows an error when disabling fails', async () => {
      (authService.twoFactorDisable as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Disable failed')
      );
      renderSettings(enabledValue());

      await userEvent.click(screen.getByRole('button', { name: /disable 2fa/i }));
      await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
      await userEvent.click(screen.getByRole('button', { name: /confirm disable/i }));

      expect(await screen.findByText('Disable failed')).toBeInTheDocument();
    });

    it('returns to the enabled screen when the disable confirmation is cancelled', async () => {
      renderSettings(enabledValue());

      await userEvent.click(screen.getByRole('button', { name: /disable 2fa/i }));
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.getByRole('button', { name: /disable 2fa/i })).toBeInTheDocument();
    });
  });
});
