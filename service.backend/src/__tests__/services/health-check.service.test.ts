import { vi } from 'vitest';
import { HealthCheckService } from '../../services/health-check.service';
import sequelize from '../../sequelize';
import EmailService from '../../services/email.service';

vi.mock('../../services/email.service', () => ({
  default: { getProviderInfo: vi.fn() },
}));

describe('HealthCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('database probe', () => {
    it('reports healthy when authenticate and the test query succeed', async () => {
      const result = await HealthCheckService.checkDatabaseHealth();
      // The real test database is the in-memory SQLite from setup-tests.ts.
      // Healthy when responseTime < 1s on the test runner; when slow, the
      // service intentionally degrades — both are acceptable, neither is
      // unhealthy.
      expect(['healthy', 'degraded']).toContain(result.status);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.lastChecked).toBeInstanceOf(Date);
    });

    it('reports unhealthy and surfaces the error when authenticate throws', async () => {
      const spy = vi.spyOn(sequelize, 'authenticate').mockRejectedValueOnce(new Error('boom'));
      const result = await HealthCheckService.checkDatabaseHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.details).toContain('boom');
      spy.mockRestore();
    });
  });

  describe('email probe', () => {
    it('reports healthy when ethereal provider info is present', async () => {
      const previous = process.env.EMAIL_PROVIDER;
      process.env.EMAIL_PROVIDER = 'ethereal';
      vi.mocked(EmailService.getProviderInfo).mockReturnValue({
        user: 'tester',
        password: 'secret',
        smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
      });

      const result = await HealthCheckService.checkEmailHealth();
      expect(result.status).toBe('healthy');
      expect(result.details).toContain('Ethereal');

      process.env.EMAIL_PROVIDER = previous;
    });

    it('reports degraded when ethereal provider info is missing', async () => {
      const previous = process.env.EMAIL_PROVIDER;
      process.env.EMAIL_PROVIDER = 'ethereal';
      vi.mocked(EmailService.getProviderInfo).mockReturnValue(null);

      const result = await HealthCheckService.checkEmailHealth();
      expect(result.status).toBe('degraded');

      process.env.EMAIL_PROVIDER = previous;
    });

    it('reports healthy with a generic message for non-ethereal providers', async () => {
      const previous = process.env.EMAIL_PROVIDER;
      process.env.EMAIL_PROVIDER = 'ses';
      const result = await HealthCheckService.checkEmailHealth();
      expect(result.status).toBe('healthy');
      expect(result.details).toContain('configured');
      process.env.EMAIL_PROVIDER = previous;
    });
  });

  describe('full health roll-up', () => {
    it('returns the overall status, uptime, and per-service breakdown', async () => {
      const result = await HealthCheckService.getFullHealthCheck();

      expect(result.services).toEqual(
        expect.objectContaining({
          database: expect.objectContaining({ status: expect.any(String) }),
          email: expect.objectContaining({ status: expect.any(String) }),
          storage: expect.objectContaining({ status: expect.any(String) }),
          fileSystem: expect.objectContaining({ status: expect.any(String) }),
        })
      );
      expect(result.metrics.memoryUsage).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('escalates the overall status to unhealthy when any service fails', async () => {
      const spy = vi.spyOn(sequelize, 'authenticate').mockRejectedValueOnce(new Error('db down'));

      const result = await HealthCheckService.getFullHealthCheck();
      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('unhealthy');
      spy.mockRestore();
    });
  });

  describe('active connection tracking', () => {
    it('reflects the most recent updateActiveConnections value', () => {
      HealthCheckService.updateActiveConnections(42);
      // No public getter — so we read it via the metrics roll-up.
      return HealthCheckService.getFullHealthCheck().then(result => {
        expect(result.metrics.activeConnections).toBe(42);
      });
    });
  });
});
