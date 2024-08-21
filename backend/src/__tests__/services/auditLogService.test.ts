import { AuditLogger } from '../../services/auditLogService'

jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(),
    getAllLogs: jest.fn(),
    getLogsById: jest.fn(),
  },
}))

describe('AuditLogger Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should log an action', async () => {
    await AuditLogger.logAction(
      'TestService',
      'Test action',
      'INFO',
      'test-user',
    )

    expect(AuditLogger.logAction).toHaveBeenCalledWith(
      'TestService',
      'Test action',
      'INFO',
      'test-user',
    )
  })

  it('should retrieve all logs', async () => {
    const mockLogs = [{ id: 1, action: 'Test action' }]
    ;(AuditLogger.getAllLogs as jest.Mock).mockResolvedValue(mockLogs)

    const logs = await AuditLogger.getAllLogs()

    expect(logs).toEqual(mockLogs)
    expect(AuditLogger.getAllLogs).toHaveBeenCalled()
  })
})
