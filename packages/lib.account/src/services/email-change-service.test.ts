import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: { post: vi.fn() },
}));

import { apiService } from '@adopt-dont-shop/lib.api';
import { confirmEmailChange, requestEmailChange } from './email-change-service';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiService.post).mockResolvedValue({ success: true });
});

describe('requestEmailChange', () => {
  it('sends the new address with the step-up credentials', async () => {
    await requestEmailChange({
      newEmail: 'new@example.com',
      password: 'hunter2',
      twoFactorToken: '123456',
    });

    expect(apiService.post).toHaveBeenCalledWith(
      '/api/v1/users/me/email-change',
      { newEmail: 'new@example.com', password: 'hunter2', twoFactorToken: '123456' },
      // A wrong password answers 401; that must not be treated as an expired session.
      { skipAuthHandling: true }
    );
  });

  it('leaves out the two-factor code when there is none', async () => {
    await requestEmailChange({ newEmail: 'new@example.com', password: 'hunter2' });

    expect(apiService.post).toHaveBeenCalledWith(
      '/api/v1/users/me/email-change',
      { newEmail: 'new@example.com', password: 'hunter2' },
      { skipAuthHandling: true }
    );
  });
});

describe('confirmEmailChange', () => {
  it('posts the one-time token', async () => {
    await confirmEmailChange('tok-123');

    expect(apiService.post).toHaveBeenCalledWith('/api/v1/auth/confirm-email-change', {
      token: 'tok-123',
    });
  });
});
