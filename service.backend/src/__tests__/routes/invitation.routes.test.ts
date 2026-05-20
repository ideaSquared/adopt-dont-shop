import { vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../middleware/error-handler';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/invitation.service', () => ({
  InvitationService: {
    acceptInvitation: vi.fn(),
    getInvitationDetails: vi.fn(),
  },
}));

import { logger } from '../../utils/logger';
import { InvitationService } from '../../services/invitation.service';
import invitationRouter from '../../routes/invitation.routes';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/invitations', invitationRouter);
  app.use(errorHandler);
  return app;
};

describe('Invitation routes — token safety in error logs', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp();
  });

  describe('POST /invitations/accept — error handling', () => {
    const validBody = {
      token: 'super-secret-invitation-token-abc123',
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'SecurePass1!',
    };

    beforeEach(() => {
      vi.mocked(InvitationService.acceptInvitation).mockRejectedValue(
        new Error('Invitation not found')
      );
    });

    it('returns a 404 when the invitation is not found', async () => {
      const res = await request(app).post('/invitations/accept').send(validBody);
      expect(res.status).toBe(404);
    });

    it('calls logger.error when the service throws', async () => {
      await request(app).post('/invitations/accept').send(validBody);
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });

    it('does not include the raw invitation token in the error log metadata', async () => {
      await request(app).post('/invitations/accept').send(validBody);

      const calls = vi.mocked(logger.error).mock.calls;
      for (const [, meta] of calls) {
        if (meta && typeof meta === 'object') {
          expect(meta).not.toHaveProperty('token', validBody.token);
        }
      }
    });

    it('does not serialize the raw token anywhere in the error log call arguments', async () => {
      await request(app).post('/invitations/accept').send(validBody);

      const serialised = JSON.stringify(vi.mocked(logger.error).mock.calls);
      expect(serialised).not.toContain(validBody.token);
    });
  });

  describe('GET /invitations/details/:token — error handling', () => {
    const rawToken = 'super-secret-invitation-token-xyz789';

    beforeEach(() => {
      vi.mocked(InvitationService.getInvitationDetails).mockRejectedValue(
        new Error('Database error')
      );
    });

    it('returns a 500 when the service throws unexpectedly', async () => {
      const res = await request(app).get(`/invitations/details/${rawToken}`);
      expect(res.status).toBe(500);
    });

    it('calls logger.error when the service throws', async () => {
      await request(app).get(`/invitations/details/${rawToken}`);
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });

    it('does not include the raw token in the error log metadata', async () => {
      await request(app).get(`/invitations/details/${rawToken}`);

      const calls = vi.mocked(logger.error).mock.calls;
      for (const [, meta] of calls) {
        if (meta && typeof meta === 'object') {
          expect(meta).not.toHaveProperty('token', rawToken);
        }
      }
    });

    it('does not serialize the raw token anywhere in the error log call arguments', async () => {
      await request(app).get(`/invitations/details/${rawToken}`);

      const serialised = JSON.stringify(vi.mocked(logger.error).mock.calls);
      expect(serialised).not.toContain(rawToken);
    });
  });
});
