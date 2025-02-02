import express, { Application } from 'express'
import request from 'supertest'
import * as ApplicationQuestionConfigService from '../../services/applicationQuestionConfigService'
import { AuditLogger } from '../../services/auditLogService'
import { AuthenticatedRequest } from '../../types'
import { Role } from '../../types/Role'

// Mock services and dependencies
jest.mock('../../services/applicationQuestionConfigService')
jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    getAuditOptions: jest.fn().mockReturnValue({}),
    logAction: jest.fn(),
  },
}))

// Mock auth middleware
jest.mock('../../middleware/authRoleOwnershipMiddleware', () => ({
  authRoleOwnershipMiddleware: () => (req: AuthenticatedRequest, res: any, next: any) => {
    req.user = {
      user_id: 'user123',
      email: 'test@example.com',
      Roles: [{ role_name: Role.RESCUE_MANAGER }],
      rescue_id: 'rescue123',
    }
    next()
  },
}))

const app: Application = express()
app.use(express.json())

// Import and use the routes
import applicationQuestionConfigRoutes from '../../routes/applicationQuestionConfigRoutes'
app.use('/api/application-question-configs', applicationQuestionConfigRoutes)

describe('ApplicationQuestionConfigController', () => {
  const mockRescueId = 'rescue123'
  const mockConfigId = 'config123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /rescue/:rescueId', () => {
    it('should return question configs for a rescue', async () => {
      const mockConfigs = [
        {
          config_id: 'config1',
          rescue_id: mockRescueId,
          question_key: 'home_type',
          category: 'HOUSEHOLD_INFORMATION',
          question_type: 'SELECT',
          question_text: 'What type of home do you live in?',
          is_enabled: true,
          is_required: true,
          options: ['House', 'Apartment', 'Condo'],
        },
      ]

      ;(ApplicationQuestionConfigService.getQuestionConfigsByRescueId as jest.Mock).mockResolvedValue(mockConfigs)

      const response = await request(app)
        .get(`/api/application-question-configs/rescue/${mockRescueId}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockConfigs)
      expect(ApplicationQuestionConfigService.getQuestionConfigsByRescueId).toHaveBeenCalledWith(mockRescueId)
      expect(AuditLogger.logAction).toHaveBeenCalled()
    })

    it('should handle errors when fetching configs', async () => {
      ;(ApplicationQuestionConfigService.getQuestionConfigsByRescueId as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get(`/api/application-question-configs/rescue/${mockRescueId}`)

      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error fetching question configs')
      expect(AuditLogger.logAction).toHaveBeenCalled()
    })
  })

  describe('PUT /:configId', () => {
    const updateData = {
      is_enabled: false,
      is_required: false,
    }

    it('should update a question config successfully', async () => {
      const mockUpdatedConfig = {
        config_id: mockConfigId,
        ...updateData,
      }

      ;(ApplicationQuestionConfigService.updateQuestionConfig as jest.Mock).mockResolvedValue(mockUpdatedConfig)

      const response = await request(app)
        .put(`/api/application-question-configs/${mockConfigId}`)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockUpdatedConfig)
      expect(ApplicationQuestionConfigService.updateQuestionConfig).toHaveBeenCalledWith(mockConfigId, updateData)
      expect(AuditLogger.logAction).toHaveBeenCalled()
    })

    it('should return 404 when config not found', async () => {
      ;(ApplicationQuestionConfigService.updateQuestionConfig as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .put(`/api/application-question-configs/${mockConfigId}`)
        .send(updateData)

      expect(response.status).toBe(404)
      expect(response.body.message).toBe('Question config not found')
      expect(AuditLogger.logAction).toHaveBeenCalled()
    })

    it('should handle errors when updating config', async () => {
      ;(ApplicationQuestionConfigService.updateQuestionConfig as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .put(`/api/application-question-configs/${mockConfigId}`)
        .send(updateData)

      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error updating question config')
      expect(AuditLogger.logAction).toHaveBeenCalled()
    })
  })

  describe('PUT /rescue/:rescueId/bulk', () => {
    const bulkUpdates = [
      { question_key: 'home_type', is_enabled: false, is_required: false },
      { question_key: 'current_pets', is_enabled: true, is_required: true },
    ]

    it('should update multiple configs successfully', async () => {
      const mockResults = [
        { question_key: 'home_type', success: true },
        { question_key: 'current_pets', success: true },
      ]

      ;(ApplicationQuestionConfigService.bulkUpdateQuestionConfigs as jest.Mock).mockResolvedValue(mockResults)

      const response = await request(app)
        .put(`/api/application-question-configs/rescue/${mockRescueId}/bulk`)
        .send(bulkUpdates)

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockResults)
      expect(ApplicationQuestionConfigService.bulkUpdateQuestionConfigs).toHaveBeenCalledWith(mockRescueId, bulkUpdates)
      expect(AuditLogger.logAction).toHaveBeenCalled()
    })

    it('should handle errors during bulk update', async () => {
      ;(ApplicationQuestionConfigService.bulkUpdateQuestionConfigs as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .put(`/api/application-question-configs/rescue/${mockRescueId}/bulk`)
        .send(bulkUpdates)

      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error processing bulk update')
      expect(AuditLogger.logAction).toHaveBeenCalled()
    })

    it('should validate that updates is an array', async () => {
      const response = await request(app)
        .put(`/api/application-question-configs/rescue/${mockRescueId}/bulk`)
        .send({ not: 'an array' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Updates must be an array')
    })
  })
})
