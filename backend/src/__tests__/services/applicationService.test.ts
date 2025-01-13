import { Op } from 'sequelize'
import Application from '../../Models/Application'
import Pet from '../../Models/Pet'
import * as applicationService from '../../services/applicationService'

jest.mock('../../Models/Application')
jest.mock('../../Models/Pet')
jest.mock('../../Models/Conversation')
jest.mock('../../Models/Participant')
jest.mock('../../Models/Message')
jest.mock('../../Models/Rating')

// TODO: Fix
describe.skip('Application Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create an application', async () => {
    const applicationData = {
      user_id: 'user1',
      pet_id: 'pet1',
      description: 'Test description',
      status: 'pending',
    }

    const createdApplication = {
      application_id: 'app1',
      ...applicationData,
    }

    ;(Application.create as jest.Mock).mockResolvedValue(createdApplication)

    const result = await applicationService.createApplication(applicationData)

    expect(Application.create).toHaveBeenCalledWith(applicationData)
    expect(result).toEqual(createdApplication)
  })

  it('should get all applications', async () => {
    const applications = [
      {
        application_id: 'app1',
        user_id: 'user1',
        pet_id: 'pet1',
        status: 'pending',
      },
      {
        application_id: 'app2',
        user_id: 'user2',
        pet_id: 'pet2',
        status: 'approved',
      },
    ]

    ;(Application.findAll as jest.Mock).mockResolvedValue(applications)

    const result = await applicationService.getAllApplications()

    expect(Application.findAll).toHaveBeenCalled()
    expect(result).toEqual(applications)
  })

  it('should get an application by ID', async () => {
    const application = {
      application_id: 'app1',
      user_id: 'user1',
      pet_id: 'pet1',
      status: 'pending',
    }

    ;(Application.findByPk as jest.Mock).mockResolvedValue(application)

    const result = await applicationService.getApplicationById('app1')

    expect(Application.findByPk).toHaveBeenCalledWith('app1')
    expect(result).toEqual(application)
  })

  it('should update an application', async () => {
    const applicationData = {
      description: 'Updated description',
      status: 'approved',
    }
    const application = {
      application_id: 'app1',
      user_id: 'user1',
      pet_id: 'pet1',
      status: 'pending',
      actioned_by: 'user1',
      update: jest.fn().mockResolvedValue({
        ...applicationData,
        actioned_by: 'user1',
      }),
    }

    ;(Application.findByPk as jest.Mock).mockResolvedValue(application)

    const result = await applicationService.updateApplication(
      'app1',
      applicationData,
      'user1',
    )

    expect(Application.findByPk).toHaveBeenCalledWith('app1')
    expect(application.update).toHaveBeenCalledWith({
      ...applicationData,
      actioned_by: 'user1',
    })
    expect(result).toEqual({
      ...applicationData,
      actioned_by: 'user1',
    })
  })

  it('should delete an application', async () => {
    const application = {
      application_id: 'app1',
      user_id: 'user1',
      pet_id: 'pet1',
      status: 'pending',
      destroy: jest.fn().mockResolvedValue(true),
    }

    ;(Application.findByPk as jest.Mock).mockResolvedValue(application)

    const result = await applicationService.deleteApplication('app1')

    expect(Application.findByPk).toHaveBeenCalledWith('app1')
    expect(application.destroy).toHaveBeenCalled()
    expect(result).toEqual(true)
  })

  it('should return false when deleting a non-existent application', async () => {
    ;(Application.findByPk as jest.Mock).mockResolvedValue(null)

    const result = await applicationService.deleteApplication('app_nonexistent')

    expect(Application.findByPk).toHaveBeenCalledWith('app_nonexistent')
    expect(result).toBe(false)
  })

  // TODO: Fix
  it.skip('should get all applications for a rescue by rescueId', async () => {
    const rescueId = 'rescue1'
    const pets = [{ pet_id: 'pet1' }, { pet_id: 'pet2' }]
    const applications = [
      {
        application_id: 'app1',
        user_id: 'user1',
        pet_id: 'pet1',
        status: 'pending',
      },
      {
        application_id: 'app2',
        user_id: 'user2',
        pet_id: 'pet2',
        status: 'approved',
      },
    ]

    ;(Pet.findAll as jest.Mock).mockResolvedValue(pets)
    ;(Application.findAll as jest.Mock).mockResolvedValue(applications)

    const result = await applicationService.getApplicationsByRescueId(rescueId)

    expect(Pet.findAll).toHaveBeenCalledWith({
      where: { owner_id: rescueId },
      attributes: ['pet_id'],
    })
    expect(Application.findAll).toHaveBeenCalledWith({
      where: { pet_id: { [Op.in]: ['pet1', 'pet2'] } },
    })
    expect(result).toEqual(applications)
  })

  it('should return an empty array if no pets are found for a rescue', async () => {
    const rescueId = 'rescue1'

    ;(Pet.findAll as jest.Mock).mockResolvedValue([]) // No pets found
    ;(Application.findAll as jest.Mock).mockResolvedValue([])

    const result = await applicationService.getApplicationsByRescueId(rescueId)

    expect(Pet.findAll).toHaveBeenCalledWith({
      where: { owner_id: rescueId },
      attributes: ['pet_id'],
    })
    expect(Application.findAll).not.toHaveBeenCalled() // Application.findAll should not be called if no pets found
    expect(result).toEqual([]) // Expect an empty result if no pets are found
  })
})
