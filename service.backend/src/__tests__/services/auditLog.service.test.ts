import { AuditLog } from '../../models/AuditLog';
import { AuditLogService } from '../../services/auditLog.service';
import { Op } from 'sequelize';

// Logger is already mocked in setup-tests.ts
// AuditLog model uses real database

describe('AuditLogService', () => {
  describe('log', () => {
    const mockAuditData = {
      userId: 'user-1',
      action: 'CREATE_PET',
      entity: 'Pet',
      entityId: 'pet-1',
      details: { petName: 'Buddy', rescueId: 'rescue-1' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should create audit log successfully', async () => {
      const result = await AuditLogService.log(mockAuditData);

      // Verify the audit log was created in database
      expect(result).toBeDefined();
      expect(result.service).toBe('adopt-dont-shop-backend');
      expect(result.user).toBe(mockAuditData.userId);
      expect(result.action).toBe(mockAuditData.action);
      expect(result.level).toBe('INFO');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.metadata).toEqual({
        entity: mockAuditData.entity,
        entityId: mockAuditData.entityId,
        details: mockAuditData.details,
        ipAddress: mockAuditData.ipAddress,
        userAgent: mockAuditData.userAgent,
      });
      expect(result.category).toBe(mockAuditData.entity);
      expect(result.ip_address).toBe(mockAuditData.ipAddress);
      expect(result.user_agent).toBe(mockAuditData.userAgent);

      // Verify it exists in database
      const found = await AuditLog.findByPk(result.id);
      expect(found).toBeDefined();
      expect(found?.action).toBe(mockAuditData.action);
    });

    it('should handle audit log creation without optional fields', async () => {
      const minimalData = {
        userId: 'user-1',
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: 'user-1',
      };

      const result = await AuditLogService.log(minimalData);

      expect(result).toBeDefined();
      expect(result.service).toBe('adopt-dont-shop-backend');
      expect(result.user).toBe(minimalData.userId);
      expect(result.action).toBe(minimalData.action);
      expect(result.level).toBe('INFO');
      expect(result.metadata).toEqual({
        entity: minimalData.entity,
        entityId: minimalData.entityId,
        details: {},
        ipAddress: undefined,
        userAgent: undefined,
      });
      expect(result.category).toBe(minimalData.entity);
      expect(result.ip_address).toBeUndefined();
      expect(result.user_agent).toBeUndefined();

      // Verify in database
      const count = await AuditLog.count();
      expect(count).toBe(1);
    });

    it('should handle audit log creation with detailed metadata', async () => {
      const detailedData = {
        userId: 'user-2',
        action: 'DELETE_APPLICATION',
        entity: 'Application',
        entityId: 'app-1',
        details: {
          petId: 'pet-1',
          applicantId: 'user-3',
          reason: 'Pet adopted by another applicant',
          notificationSent: true,
          performedBy: 'admin-1',
        },
        ipAddress: '10.0.0.1',
        userAgent: 'Admin Dashboard/1.0',
      };

      const result = await AuditLogService.log(detailedData);

      expect(result).toBeDefined();
      expect(result.action).toBe(detailedData.action);
      expect(result.metadata.details).toEqual(detailedData.details);

      // Verify complex metadata was stored correctly
      const found = await AuditLog.findByPk(result.id);
      expect(found?.metadata.details).toEqual(detailedData.details);
    });

    it('should set custom level and status', async () => {
      const data = {
        userId: 'user-1',
        action: 'FAILED_LOGIN',
        entity: 'Auth',
        entityId: 'user-1',
        level: 'WARNING' as const,
        status: 'failure' as const,
      };

      const result = await AuditLogService.log(data);

      expect(result.level).toBe('WARNING');
      expect(result.status).toBe('failure');
    });
  });

  describe('getAuditLogs (instance method)', () => {
    beforeEach(async () => {
      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: 'user-1',
        action: 'CREATE_PET',
        level: 'INFO',
        timestamp: new Date('2024-01-01'),
        metadata: {},
        category: 'Pet',
      });

      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: 'user-2',
        action: 'UPDATE_USER',
        level: 'INFO',
        timestamp: new Date('2024-01-02'),
        metadata: {},
        category: 'User',
      });

      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: 'user-1',
        action: 'DELETE_APPLICATION',
        level: 'WARNING',
        timestamp: new Date('2024-01-03'),
        metadata: {},
        category: 'Application',
      });
    });

    it('should filter by userId', async () => {
      const service = new AuditLogService();
      const result = await service.getAuditLogs({ userId: 'user-1' });

      expect(result.logs).toHaveLength(2);
      expect(result.logs.every(log => log.user === 'user-1')).toBe(true);
    });

    it('should filter by action', async () => {
      const service = new AuditLogService();
      const result = await service.getAuditLogs({ action: 'CREATE_PET' });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('CREATE_PET');
    });

    it('should handle pagination', async () => {
      const service = new AuditLogService();
      const page1 = await service.getAuditLogs({ page: 1, limit: 2 });
      const page2 = await service.getAuditLogs({ page: 2, limit: 2 });

      expect(page1.logs).toHaveLength(2);
      expect(page2.logs).toHaveLength(1);
      expect(page1.pagination.currentPage).toBe(1);
      expect(page2.pagination.currentPage).toBe(2);
    });

    it('should sort by timestamp descending', async () => {
      const service = new AuditLogService();
      const result = await service.getAuditLogs({});

      expect(result.logs).toHaveLength(3);
      expect(new Date(result.logs[0].timestamp).getTime()).toBeGreaterThan(
        new Date(result.logs[1].timestamp).getTime()
      );
    });
  });

  describe('cleanupOldLogs', () => {
    beforeEach(async () => {
      // Create old and recent logs
      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: 'user-1',
        action: 'OLD_ACTION',
        level: 'INFO',
        timestamp: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days old
        metadata: {},
        category: 'Test',
      });

      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: 'user-2',
        action: 'RECENT_ACTION',
        level: 'INFO',
        timestamp: new Date(),
        metadata: {},
        category: 'Test',
      });
    });

    it('should delete logs older than specified days', async () => {
      const deleted = await AuditLogService.cleanupOldLogs(90); // Delete logs older than 90 days

      expect(deleted).toBe(1);

      const remaining = await AuditLog.count();
      expect(remaining).toBe(1);

      const recentLog = await AuditLog.findOne({ where: { action: 'RECENT_ACTION' } });
      expect(recentLog).toBeDefined();
    });

    it('should not delete logs within retention period', async () => {
      const deleted = await AuditLogService.cleanupOldLogs(200); // 200 days

      expect(deleted).toBe(0);

      const allLogs = await AuditLog.count();
      expect(allLogs).toBe(2);
    });
  });

  describe('getAuditLogs (instance method)', () => {
    beforeEach(async () => {
      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: 'user-1',
        action: 'CREATE_PET',
        level: 'INFO',
        timestamp: new Date('2024-01-01'),
        metadata: {},
        category: 'Pet',
      });

      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: 'user-2',
        action: 'UPDATE_USER',
        level: 'INFO',
        timestamp: new Date('2024-01-02'),
        metadata: {},
        category: 'User',
      });

      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: 'user-1',
        action: 'DELETE_APPLICATION',
        level: 'WARNING',
        timestamp: new Date('2024-01-03'),
        metadata: {},
        category: 'Application',
      });
    });

    it('should filter by userId', async () => {
      const service = new AuditLogService();
      const result = await service.getAuditLogs({ userId: 'user-1' });

      expect(result.logs).toHaveLength(2);
      expect(result.logs.every(log => log.user === 'user-1')).toBe(true);
    });

    it('should filter by action', async () => {
      const service = new AuditLogService();
      const result = await service.getAuditLogs({ action: 'CREATE_PET' });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('CREATE_PET');
    });

    it('should handle pagination', async () => {
      const service = new AuditLogService();
      const page1 = await service.getAuditLogs({ page: 1, limit: 2 });
      const page2 = await service.getAuditLogs({ page: 2, limit: 2 });

      expect(page1.logs).toHaveLength(2);
      expect(page2.logs).toHaveLength(1);
      expect(page1.pagination.currentPage).toBe(1);
      expect(page2.pagination.currentPage).toBe(2);
    });

    it('should sort by timestamp descending', async () => {
      const service = new AuditLogService();
      const result = await service.getAuditLogs({});

      expect(result.logs).toHaveLength(3);
      expect(new Date(result.logs[0].timestamp).getTime()).toBeGreaterThan(
        new Date(result.logs[1].timestamp).getTime()
      );
    });
  });
});
