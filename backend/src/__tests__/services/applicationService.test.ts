import { Op } from 'sequelize'
import { Application, Pet, User } from '../../Models'
import * as applicationService from '../../services/applicationService'

// Mock the models
jest.mock('../../Models', () => ({
  Application: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Pet: {
    findAll: jest.fn(),
  },
  User: {
    findAll: jest.fn(),
  },
}))

describe('ApplicationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createApplication', () => {
    it('should create an application', async () => {
      const mockApplication = {
        application_id: 'app_123',
        user_id: 'user_123',
        pet_id: 'pet_123',
        rescue_id: 'rescue_123',
        status: 'pending',
        answers: {
          home_type: 'house',
          own_or_rent: 'own',
        },
      }

      ;(Application.create as jest.Mock).mockResolvedValue(mockApplication)

      const result = await applicationService.createApplication(mockApplication)

      expect(Application.create).toHaveBeenCalledWith(mockApplication)
      expect(result).toEqual(mockApplication)
    })

    it('should handle errors during application creation', async () => {
      const error = new Error('Database error')
      ;(Application.create as jest.Mock).mockRejectedValue(error)

      await expect(
        applicationService.createApplication({
          user_id: 'user_123',
          pet_id: 'pet_123',
        }),
      ).rejects.toThrow()
    })
  })

  describe('getAllApplications', () => {
    it('should return all applications', async () => {
      const mockApplications = [
        {
          application_id: 'app_123',
          user_id: 'user_123',
          pet_id: 'pet_123',
          status: 'pending',
        },
        {
          application_id: 'app_124',
          user_id: 'user_124',
          pet_id: 'pet_124',
          status: 'approved',
        },
      ]

      ;(Application.findAll as jest.Mock).mockResolvedValue(mockApplications)

      const result = await applicationService.getAllApplications()

      expect(Application.findAll).toHaveBeenCalled()
      expect(result).toEqual(mockApplications)
    })

    it('should handle errors when fetching applications', async () => {
      const error = new Error('Database error')
      ;(Application.findAll as jest.Mock).mockRejectedValue(error)

      await expect(applicationService.getAllApplications()).rejects.toThrow()
    })
  })

  describe('getApplicationById', () => {
    it('should return an application by ID', async () => {
      const mockApplication = {
        application_id: 'app_123',
        user_id: 'user_123',
        pet_id: 'pet_123',
        status: 'pending',
      }

      ;(Application.findByPk as jest.Mock).mockResolvedValue(mockApplication)

      const result = await applicationService.getApplicationById('app_123')

      expect(Application.findByPk).toHaveBeenCalledWith('app_123')
      expect(result).toEqual(mockApplication)
    })

    it('should return null for non-existent application', async () => {
      ;(Application.findByPk as jest.Mock).mockResolvedValue(null)

      const result = await applicationService.getApplicationById('non_existent')

      expect(result).toBeNull()
    })
  })

  describe('getApplicationsByRescueId', () => {
    it('should return enriched applications for a rescue', async () => {
      const mockPets = [
        { pet_id: 'pet_123', name: 'Fluffy' },
        { pet_id: 'pet_124', name: 'Buddy' },
      ]

      const mockApplications = [
        {
          application_id: 'app_123',
          user_id: 'user_123',
          pet_id: 'pet_123',
          status: 'pending',
          actioned_by: 'user_789',
          toJSON: () => ({
            application_id: 'app_123',
            user_id: 'user_123',
            pet_id: 'pet_123',
            status: 'pending',
            actioned_by: 'user_789',
          }),
        },
        {
          application_id: 'app_124',
          user_id: 'user_124',
          pet_id: 'pet_124',
          status: 'approved',
          actioned_by: null,
          toJSON: () => ({
            application_id: 'app_124',
            user_id: 'user_124',
            pet_id: 'pet_124',
            status: 'approved',
            actioned_by: null,
          }),
        },
      ]

      const mockUsers = [
        { user_id: 'user_123', first_name: 'John' },
        { user_id: 'user_124', first_name: 'Jane' },
        { user_id: 'user_789', first_name: 'Admin' },
      ]

      ;(Pet.findAll as jest.Mock).mockResolvedValue(mockPets)
      ;(Application.findAll as jest.Mock).mockResolvedValue(mockApplications)
      ;(User.findAll as jest.Mock)
        .mockResolvedValueOnce(mockUsers.slice(0, 2)) // For applicants
        .mockResolvedValueOnce([mockUsers[2]]) // For actioned_by

      const result =
        await applicationService.getApplicationsByRescueId('rescue_123')

      expect(Pet.findAll).toHaveBeenCalledWith({
        where: { owner_id: 'rescue_123' },
        attributes: ['pet_id'],
      })

      expect(Application.findAll).toHaveBeenCalledWith({
        where: { pet_id: { [Op.in]: ['pet_123', 'pet_124'] } },
      })

      expect(result).toEqual([
        {
          application_id: 'app_123',
          user_id: 'user_123',
          pet_id: 'pet_123',
          status: 'pending',
          actioned_by: 'user_789',
          pet_name: 'Fluffy',
          applicant_first_name: 'John',
          actioned_by_first_name: 'Admin',
        },
        {
          application_id: 'app_124',
          user_id: 'user_124',
          pet_id: 'pet_124',
          status: 'approved',
          actioned_by: null,
          pet_name: 'Buddy',
          applicant_first_name: 'Jane',
          actioned_by_first_name: null,
        },
      ])
    })

    it('should return empty array when rescue has no pets', async () => {
      ;(Pet.findAll as jest.Mock).mockResolvedValue([])

      const result =
        await applicationService.getApplicationsByRescueId('rescue_123')

      expect(result).toEqual([])
    })

    it('should return empty array when no applications found for pets', async () => {
      const mockPets = [{ pet_id: 'pet_123' }]
      ;(Pet.findAll as jest.Mock).mockResolvedValue(mockPets)
      ;(Application.findAll as jest.Mock).mockResolvedValue([])

      const result =
        await applicationService.getApplicationsByRescueId('rescue_123')

      expect(result).toEqual([])
    })
  })

  describe('updateApplication', () => {
    it('should update an application', async () => {
      const mockApplication = {
        application_id: 'app_123',
        status: 'pending',
        update: jest.fn().mockImplementation(function (this: any, data: any) {
          Object.assign(this, data)
          return this
        }),
      }

      ;(Application.findByPk as jest.Mock).mockResolvedValue(mockApplication)

      const updateData = { status: 'approved' }
      const result = await applicationService.updateApplication(
        'app_123',
        updateData,
        'user_123',
      )

      expect(mockApplication.update).toHaveBeenCalledWith({
        ...updateData,
        actioned_by: 'user_123',
      })
      expect(result?.status).toBe('approved')
    })

    it('should return null for non-existent application', async () => {
      ;(Application.findByPk as jest.Mock).mockResolvedValue(null)

      const result = await applicationService.updateApplication(
        'non_existent',
        { status: 'approved' },
        'user_123',
      )

      expect(result).toBeNull()
    })
  })

  describe('deleteApplication', () => {
    it('should delete an application', async () => {
      const mockApplication = {
        application_id: 'app_123',
        destroy: jest.fn().mockResolvedValue(undefined),
      }

      ;(Application.findByPk as jest.Mock).mockResolvedValue(mockApplication)

      const result = await applicationService.deleteApplication('app_123')

      expect(mockApplication.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false for non-existent application', async () => {
      ;(Application.findByPk as jest.Mock).mockResolvedValue(null)

      const result = await applicationService.deleteApplication('non_existent')

      expect(result).toBe(false)
    })
  })
})
