import { Op } from 'sequelize'
import { AuditLog } from '../../Models'
import { AuditLogger } from '../../services/auditLogService'

// Mock the AuditLog model
jest.mock('../../Models', () => ({
  AuditLog: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
  },
}))

describe('AuditLogger Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('logAction', () => {
    it('should create an audit log entry with basic fields', async () => {
      const mockCreate = AuditLog.create as jest.Mock
      mockCreate.mockResolvedValueOnce({ id: 1 })

      await AuditLogger.logAction('TestService', 'Test action', 'INFO')

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'TestService',
          action: 'Test action',
          level: 'INFO',
          user: null,
          category: 'GENERAL',
        }),
      )
    })

    it('should create an audit log entry with all optional fields', async () => {
      const mockCreate = AuditLog.create as jest.Mock
      mockCreate.mockResolvedValueOnce({ id: 1 })

      const options = {
        metadata: { key: 'value' },
        category: 'TEST',
        ip_address: '127.0.0.1',
        user_agent: 'Jest Test',
      }

      await AuditLogger.logAction(
        'TestService',
        'Test action',
        'WARNING',
        'test-user',
        options,
      )

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'TestService',
          action: 'Test action',
          level: 'WARNING',
          user: 'test-user',
          ...options,
        }),
      )
    })

    it('should handle errors gracefully', async () => {
      const mockCreate = AuditLog.create as jest.Mock
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      mockCreate.mockRejectedValueOnce(new Error('Test error'))

      await AuditLogger.logAction('TestService', 'Test action', 'ERROR')

      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })

  describe('getAllLogs', () => {
    it('should retrieve logs with pagination', async () => {
      const mockLogs = [
        { id: 1, action: 'Test 1' },
        { id: 2, action: 'Test 2' },
      ]
      const mockFindAndCountAll = AuditLog.findAndCountAll as jest.Mock
      mockFindAndCountAll.mockResolvedValueOnce({
        rows: mockLogs,
        count: 2,
      })

      const result = await AuditLogger.getAllLogs(1, 10)

      expect(result).toEqual({
        logs: mockLogs,
        total: 2,
      })
      expect(mockFindAndCountAll).toHaveBeenCalledWith({
        where: {},
        order: [['timestamp', 'DESC']],
        offset: 0,
        limit: 10,
      })
    })

    it('should apply filters correctly', async () => {
      const mockFindAndCountAll = AuditLog.findAndCountAll as jest.Mock
      mockFindAndCountAll.mockResolvedValueOnce({
        rows: [],
        count: 0,
      })

      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        level: 'INFO' as const,
        service: 'TestService',
        category: 'TEST',
        user: 'test-user',
        search: 'searchTerm',
      }

      await AuditLogger.getAllLogs(1, 10, filters)

      expect(mockFindAndCountAll).toHaveBeenCalledWith({
        where: {
          timestamp: {
            [Op.between]: [filters.startDate, filters.endDate],
          },
          level: filters.level,
          service: filters.service,
          category: filters.category,
          user: filters.user,
          [Op.or]: [
            { action: { [Op.iLike]: '%searchTerm%' } },
            { service: { [Op.iLike]: '%searchTerm%' } },
          ],
        },
        order: [['timestamp', 'DESC']],
        offset: 0,
        limit: 10,
      })
    })
  })

  describe('getLogsByUserId', () => {
    it('should retrieve logs for a specific user', async () => {
      const mockLogs = [{ id: 1, user: 'test-user' }]
      const mockFindAndCountAll = AuditLog.findAndCountAll as jest.Mock
      mockFindAndCountAll.mockResolvedValueOnce({
        rows: mockLogs,
        count: 1,
      })

      const result = await AuditLogger.getLogsByUserId('test-user')

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
      })
      expect(mockFindAndCountAll).toHaveBeenCalledWith({
        where: { user: 'test-user' },
        order: [['timestamp', 'DESC']],
        offset: 0,
        limit: 10,
      })
    })
  })

  describe('getLogsByDateRange', () => {
    it('should retrieve logs within a date range', async () => {
      const mockLogs = [{ id: 1, timestamp: new Date() }]
      const mockFindAndCountAll = AuditLog.findAndCountAll as jest.Mock
      mockFindAndCountAll.mockResolvedValueOnce({
        rows: mockLogs,
        count: 1,
      })

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-02')

      const result = await AuditLogger.getLogsByDateRange(startDate, endDate)

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
      })
      expect(mockFindAndCountAll).toHaveBeenCalledWith({
        where: {
          timestamp: {
            [Op.between]: [startDate, endDate],
          },
        },
        order: [['timestamp', 'DESC']],
        offset: 0,
        limit: 10,
      })
    })
  })

  describe('getLogsByCategory', () => {
    it('should retrieve logs for a specific category', async () => {
      const mockLogs = [{ id: 1, category: 'TEST' }]
      const mockFindAndCountAll = AuditLog.findAndCountAll as jest.Mock
      mockFindAndCountAll.mockResolvedValueOnce({
        rows: mockLogs,
        count: 1,
      })

      const result = await AuditLogger.getLogsByCategory('TEST')

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
      })
      expect(mockFindAndCountAll).toHaveBeenCalledWith({
        where: { category: 'TEST' },
        order: [['timestamp', 'DESC']],
        offset: 0,
        limit: 10,
      })
    })
  })
})
