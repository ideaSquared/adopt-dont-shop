import { describe, expect, it } from 'vitest';
import { AuditLog, withAuditMutationAllowed } from '../../models/AuditLog';

describe('AuditLog immutability (ADS-508)', () => {
  const baseRow = {
    service: 'adopt-dont-shop-backend',
    user: null,
    user_email_snapshot: null,
    action: 'TEST',
    level: 'INFO' as const,
    status: 'success' as const,
    timestamp: new Date(),
    metadata: { test: true },
    category: 'TEST',
    ip_address: null,
    user_agent: null,
  };

  it('rejects update() on a saved row', async () => {
    const row = await AuditLog.create({ ...baseRow });
    await expect(row.update({ action: 'TAMPERED' })).rejects.toThrow(/append-only/);
  });

  it('rejects destroy() on a saved row', async () => {
    const row = await AuditLog.create({ ...baseRow });
    await expect(row.destroy()).rejects.toThrow(/append-only/);
  });

  it('rejects bulk destroy by default', async () => {
    await AuditLog.create({ ...baseRow });
    await expect(AuditLog.destroy({ where: { action: 'TEST' } })).rejects.toThrow(/append-only/);
  });

  it('allows mutation inside withAuditMutationAllowed (retention path)', async () => {
    const row = await AuditLog.create({ ...baseRow, action: 'OLD' });
    await withAuditMutationAllowed(() => row.destroy());
    const reloaded = await AuditLog.findByPk(row.id, { paranoid: false });
    expect(reloaded).toBeNull();
  });
});
