import express, { Application } from 'express'
import request from 'supertest'
import { createRescueAccountController } from '../../controllers/userController'
import router from '../../routes/rescueRoutes'

// Mock the createRescueAccount controller
jest.mock('../../controllers/userController', () => ({
  createRescueAccountController: jest.fn(),
}))

const app: Application = express()
app.use(express.json())
app.use('/api/rescue', router)

describe('Rescue Account Routes', () => {
  it('should route POST /api/create-rescue to the createRescueAccount controller', async () => {
    // Mock the createRescueAccount response
    const mockResponse = {
      message: 'Rescue and user created successfully',
      user: {
        first_name: 'Testy',
        last_name: 'Testyerson',
        email: 'tester@test.com',
      },
      rescue: {
        rescue_type: 'charity',
        rescue_name: 'TestyiersCharity',
        city: 'TestLane',
        country: 'United Kingdom',
      },
      staffMember: { id: 1 },
    }

    ;(createRescueAccountController as jest.Mock).mockImplementation(
      (req, res) => {
        res.status(201).json(mockResponse)
      },
    )

    const response = await request(app)
      .post('/api/rescue/create-rescue')
      .send({
        user: {
          first_name: 'Testy',
          last_name: 'Testyerson',
          email: 'unittester@test.com',
          password: '123456',
        },
        rescue: {
          rescue_type: 'charity',
          rescue_name: 'TestyiersCharity',
          city: 'TestLane',
          country: 'United Kingdom',
          reference_number: '',
        },
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual(mockResponse)
  })
})
