import ApplicationQuestionConfig from '../../Models/ApplicationQuestionConfig'
import * as ApplicationQuestionConfigService from '../../services/applicationQuestionConfigService'

jest.mock('../../Models/ApplicationQuestionConfig')

describe('ApplicationQuestionConfigService', () => {
  const mockRescueId = 'rescue123'
  const mockConfigId = 'config123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getQuestionConfigsByRescueId', () => {
    it('should fetch all question configs for a rescue', async () => {
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
        {
          config_id: 'config2',
          rescue_id: mockRescueId,
          question_key: 'current_pets',
          category: 'PET_OWNERSHIP_EXPERIENCE',
          question_type: 'BOOLEAN',
          question_text: 'Do you have any current pets?',
          is_enabled: true,
          is_required: true,
        },
      ]

      ;(ApplicationQuestionConfig.findAll as jest.Mock).mockResolvedValue(
        mockConfigs,
      )

      const result =
        await ApplicationQuestionConfigService.getQuestionConfigsByRescueId(
          mockRescueId,
        )

      expect(result).toEqual(mockConfigs)
      expect(ApplicationQuestionConfig.findAll).toHaveBeenCalledWith({
        where: { rescue_id: mockRescueId },
        order: [
          ['category', 'ASC'],
          ['question_key', 'ASC'],
        ],
      })
    })

    it('should return empty array when no configs found', async () => {
      ;(ApplicationQuestionConfig.findAll as jest.Mock).mockResolvedValue([])

      const result =
        await ApplicationQuestionConfigService.getQuestionConfigsByRescueId(
          mockRescueId,
        )

      expect(result).toEqual([])
      expect(ApplicationQuestionConfig.findAll).toHaveBeenCalled()
    })
  })

  describe('updateQuestionConfig', () => {
    it('should update a question config successfully', async () => {
      const updateData = {
        is_enabled: false,
        is_required: false,
      }

      const mockConfig = {
        config_id: mockConfigId,
        update: jest
          .fn()
          .mockResolvedValue({ ...updateData, config_id: mockConfigId }),
      }

      ;(ApplicationQuestionConfig.findByPk as jest.Mock).mockResolvedValue(
        mockConfig,
      )

      const result =
        await ApplicationQuestionConfigService.updateQuestionConfig(
          mockConfigId,
          updateData,
        )

      expect(ApplicationQuestionConfig.findByPk).toHaveBeenCalledWith(
        mockConfigId,
      )
      expect(mockConfig.update).toHaveBeenCalledWith(updateData)
      expect(result).toEqual({ ...updateData, config_id: mockConfigId })
    })

    it('should return null when config not found', async () => {
      ;(ApplicationQuestionConfig.findByPk as jest.Mock).mockResolvedValue(null)

      const result =
        await ApplicationQuestionConfigService.updateQuestionConfig(
          mockConfigId,
          {
            is_enabled: false,
          },
        )

      expect(result).toBeNull()
      expect(ApplicationQuestionConfig.findByPk).toHaveBeenCalledWith(
        mockConfigId,
      )
    })
  })

  describe('bulkUpdateQuestionConfigs', () => {
    it('should update multiple question configs successfully', async () => {
      const updates = [
        { question_key: 'home_type', is_enabled: false, is_required: false },
        { question_key: 'current_pets', is_enabled: true, is_required: true },
      ]

      ;(ApplicationQuestionConfig.update as jest.Mock).mockResolvedValueOnce([
        1,
      ])
      ;(ApplicationQuestionConfig.update as jest.Mock).mockResolvedValueOnce([
        1,
      ])

      const result =
        await ApplicationQuestionConfigService.bulkUpdateQuestionConfigs(
          mockRescueId,
          updates,
        )

      expect(result).toEqual([
        { question_key: 'home_type', success: true },
        { question_key: 'current_pets', success: true },
      ])

      expect(ApplicationQuestionConfig.update).toHaveBeenCalledTimes(2)
      updates.forEach((update) => {
        expect(ApplicationQuestionConfig.update).toHaveBeenCalledWith(
          {
            is_enabled: update.is_enabled,
            is_required: update.is_required,
          },
          {
            where: {
              rescue_id: mockRescueId,
              question_key: update.question_key,
            },
          },
        )
      })
    })

    it('should handle failed updates', async () => {
      const updates = [
        { question_key: 'home_type', is_enabled: false, is_required: false },
        { question_key: 'current_pets', is_enabled: true, is_required: true },
      ]

      ;(ApplicationQuestionConfig.update as jest.Mock).mockResolvedValueOnce([
        0,
      ])
      ;(ApplicationQuestionConfig.update as jest.Mock).mockResolvedValueOnce([
        1,
      ])

      const result =
        await ApplicationQuestionConfigService.bulkUpdateQuestionConfigs(
          mockRescueId,
          updates,
        )

      expect(result).toEqual([
        { question_key: 'home_type', success: false },
        { question_key: 'current_pets', success: true },
      ])
    })
  })
})
