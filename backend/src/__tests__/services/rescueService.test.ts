import { Rescue as RescueModel } from '../../Models'
import {
  getAllRescuesService,
  getSingleRescueService,
  updateRescueService,
} from '../../services/rescueService'
import { User } from '../../types'

jest.mock('../../Models', () => ({
  Rescue: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  StaffMember: {},
  User: {},
}))

describe('Rescue Service', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockUser: User = {
    user_id: '1',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
  }

  it('should get all rescues', async () => {
    const mockRescues = [
      {
        rescue_id: '1',
        rescue_name: 'Rescue1',
        rescue_type: 'Organization',
        city: 'City1',
        country: 'Country1',
        staff: [
          {
            user_id: '1',
            user: { first_name: 'John', email: 'john@example.com' },
            role: 'Admin',
            verified_by_rescue: true,
          },
        ],
      },
    ]

    ;(RescueModel.findAll as jest.Mock).mockResolvedValue(mockRescues)

    const result = await getAllRescuesService()

    expect(RescueModel.findAll).toHaveBeenCalled()
    expect(result).toHaveLength(1)
    expect(result[0].rescue_name).toBe('Rescue1')
  })

  it('should get a single rescue with full data for staff user', async () => {
    const mockRescue = {
      rescue_id: '1',
      rescue_name: 'Rescue1',
      rescue_type: 'Organization',
      city: 'City1',
      country: 'Country1',
      staff: [
        {
          user_id: '1',
          user: { first_name: 'John', email: 'john@example.com' },
          role: 'Admin',
          verified_by_rescue: true,
        },
      ],
    }

    ;(RescueModel.findByPk as jest.Mock).mockResolvedValue(mockRescue)

    const result = await getSingleRescueService('1', mockUser)

    expect(RescueModel.findByPk).toHaveBeenCalledWith('1', expect.any(Object))
    expect(result).not.toBeNull()

    if (result) {
      expect(result.rescue_name).toBe('Rescue1')
      if ('staff' in result) {
        expect(result.staff).toHaveLength(1) // Full data includes staff
      }
    }
  })

  it('should get a single rescue with limited data for non-staff user', async () => {
    const mockRescue = {
      rescue_id: '1',
      rescue_name: 'Rescue1',
      rescue_type: 'Organization',
      city: 'City1',
      country: 'Country1',
      staff: [
        {
          user_id: '2', // Different user_id, so not part of the staff
          user: { first_name: 'Jane', email: 'jane@example.com' },
          role: 'Admin',
          verified_by_rescue: true,
        },
      ],
    }

    const nonStaffUser: User = { ...mockUser, user_id: '3' } // Non-staff user

    ;(RescueModel.findByPk as jest.Mock).mockResolvedValue(mockRescue)

    const result = await getSingleRescueService('1', nonStaffUser)

    expect(RescueModel.findByPk).toHaveBeenCalledWith('1', expect.any(Object))
    expect(result).not.toBeNull()

    if (result) {
      expect(result.rescue_name).toBe('Rescue1')
      if ('staff' in result) {
        expect(result.staff).toBeUndefined() // Limited data has no staff info
      }
    }
  })

  it('should get a single individual rescue with one staff member', async () => {
    const mockRescue = {
      rescue_id: '1',
      rescue_name: 'RescueIndividual',
      rescue_type: 'Individual',
      city: 'City2',
      country: 'Country2',
      staff: [
        {
          user_id: '1',
          user: { first_name: 'John', email: 'john@example.com' },
          role: 'Owner',
          verified_by_rescue: true,
        },
      ],
    }

    ;(RescueModel.findByPk as jest.Mock).mockResolvedValue(mockRescue)

    const result = await getSingleRescueService('1', mockUser)

    expect(RescueModel.findByPk).toHaveBeenCalledWith('1', expect.any(Object))
    expect(result).not.toBeNull()

    if (result) {
      expect(result.rescue_name).toBe('RescueIndividual')
      expect(result.rescue_type).toBe('Individual')
      if ('staff' in result) {
        expect(result.staff).toHaveLength(1) // Individual rescue has only one staff member
      }
    }
  })

  it('should get a single organization rescue with multiple staff members', async () => {
    const mockRescue = {
      rescue_id: '2',
      rescue_name: 'RescueOrg',
      rescue_type: 'Organization',
      city: 'City3',
      country: 'Country3',
      staff: [
        {
          user_id: '1',
          user: { first_name: 'Alice', email: 'alice@example.com' },
          role: 'Manager',
          verified_by_rescue: true,
        },
        {
          user_id: '2',
          user: { first_name: 'Bob', email: 'bob@example.com' },
          role: 'Volunteer',
          verified_by_rescue: false,
        },
      ],
    }

    ;(RescueModel.findByPk as jest.Mock).mockResolvedValue(mockRescue)

    const result = await getSingleRescueService('2', mockUser)

    expect(RescueModel.findByPk).toHaveBeenCalledWith('2', expect.any(Object))
    expect(result).not.toBeNull()

    if (result) {
      expect(result.rescue_name).toBe('RescueOrg')
      if ('staff' in result) {
        expect(result.staff).toHaveLength(2) // Organization rescue has multiple staff members
      }
    }
  })

  describe('Rescue Service - Update Rescue', () => {
    afterEach(() => {
      jest.clearAllMocks()
    })

    const rescueId = '1'
    const updatedData = {
      rescue_name: 'Updated Rescue Name',
      country: 'Updated Country',
    }

    it('should update a rescue and return the updated data', async () => {
      const mockRescue = {
        rescue_id: rescueId,
        update: jest
          .fn()
          .mockResolvedValue({ rescue_id: rescueId, ...updatedData }),
      }
      ;(RescueModel.findByPk as jest.Mock).mockResolvedValue(mockRescue)

      const result = await updateRescueService(rescueId, updatedData)

      expect(RescueModel.findByPk).toHaveBeenCalledWith(rescueId)
      expect(mockRescue.update).toHaveBeenCalledWith(updatedData)
      expect(result).toEqual({ rescue_id: rescueId, ...updatedData })
    })
  })
})
