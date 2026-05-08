import { vi } from 'vitest';
import ConfigurationService from '../../services/configuration.service';

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
}));

describe('ConfigurationService', () => {
  describe('default configurations', () => {
    it('seeds the well-known keys consumers depend on', async () => {
      expect(await ConfigurationService.get('app.name')).toBe("Adopt Don't Shop");
      expect(await ConfigurationService.get('security.password_min_length')).toBe(8);
      expect(await ConfigurationService.get('ui.theme')).toBe('light');
    });

    it('exposes only the configurations marked public', async () => {
      const publicConfigs = await ConfigurationService.getPublicConfigurations();
      expect(publicConfigs).toHaveProperty('app.name');
      expect(publicConfigs).toHaveProperty('ui.theme');
      // Server-only knobs must never leak through this view.
      expect(publicConfigs).not.toHaveProperty('email.from_address');
      expect(publicConfigs).not.toHaveProperty('features.chat.enabled');
    });
  });

  describe('set / validation', () => {
    it('persists a new value and surfaces it via get', async () => {
      await ConfigurationService.set('custom.flag', 'on', 'admin-1');
      expect(await ConfigurationService.get('custom.flag')).toBe('on');
    });

    it('rejects values that fail allowedValues validation', async () => {
      await expect(ConfigurationService.set('ui.theme', 'neon', 'admin-1')).rejects.toThrow(
        /must be one of/
      );
    });

    it('rejects values that fail min/max validation', async () => {
      await expect(
        ConfigurationService.set('performance.cache_ttl', 10, 'admin-1')
      ).rejects.toThrow(/at least 60/);
    });

    it('rejects values that fail required validation', async () => {
      await expect(ConfigurationService.set('email.from_address', '', 'admin-1')).rejects.toThrow(
        /required/
      );
    });
  });

  describe('delete', () => {
    it('returns false when deleting a non-existent key', async () => {
      const result = await ConfigurationService.delete('does.not.exist', 'admin-1');
      expect(result).toBe(false);
    });

    it('removes a key when deletion succeeds', async () => {
      await ConfigurationService.set('temp.key', 'value', 'admin-1');
      const removed = await ConfigurationService.delete('temp.key', 'admin-1');
      expect(removed).toBe(true);
      expect(await ConfigurationService.get('temp.key')).toBeUndefined();
    });
  });

  describe('filtering and categories', () => {
    it('filters configurations by category', async () => {
      const securityConfigs = await ConfigurationService.getAllConfigurations({
        category: 'security',
      });
      expect(securityConfigs.length).toBeGreaterThan(0);
      expect(securityConfigs.every(c => c.category === 'security')).toBe(true);
    });

    it('filters configurations by search term against key and description', async () => {
      const matches = await ConfigurationService.getAllConfigurations({ search: 'theme' });
      expect(matches.some(c => c.key === 'ui.theme')).toBe(true);
    });

    it('lists every distinct category in alphabetical order', async () => {
      const categories = await ConfigurationService.getCategories();
      expect(categories).toEqual([...categories].sort());
      expect(categories).toContain('security');
    });
  });

  describe('bulkUpdate', () => {
    it('reports successes and failures separately', async () => {
      const result = await ConfigurationService.bulkUpdate(
        [
          { key: 'ui.theme', value: 'dark' },
          { key: 'ui.theme', value: 'invalid-theme' },
        ],
        'admin-1'
      );

      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].key).toBe('ui.theme');
    });
  });
});
