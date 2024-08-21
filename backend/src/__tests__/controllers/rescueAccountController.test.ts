import express, { Application } from 'express'
import request from 'supertest'
import { createRescueAccount } from '../../controllers/userController'
import { createUser } from '../../services/authService'

jest.mock('../../services/authService')

const app: Application = express()
app.use(express.json())
app.use('/api/rescue', createRescueAccount)

describe('Rescue Account Controller - createRescueAccount', () => {
  const userData = {
    first_name: 'Testy',
    last_name: 'Testyerson',
    email: 'tester@test.com',
    password: '123456',
    confirmPassword: '123456',
  }

  const rescueData = {
    rescue_type: 'charity',
    rescue_name: 'TestyiersCharity',
    city: 'TestLane',
    country: 'United Kingdom',
    reference_number: '',
  }

  it('should return 201 and success message on successful creation', async () => {
    ;(createUser as jest.Mock).mockResolvedValue({
      user: userData,
      rescue: rescueData,
      staffMember: { id: 1 },
    })

    const response = await request(app)
      .post('/api/rescue/create-rescue')
      .send({ user: userData, rescue: rescueData })

    expect(response.status).toBe(201)
    expect(response.body.message).toBe('Rescue and user created successfully')
  })

  it('should return 400 if email is missing or invalid', async () => {
    const response = await request(app)
      .post('/api/rescue/create-rescue')
      .send({ user: { ...userData, email: '' }, rescue: rescueData })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('Email is required and must be a string')
  })

  it('should return 500 if service throws an error', async () => {
    ;(createUser as jest.Mock).mockRejectedValue(new Error('Service error'))

    const response = await request(app)
      .post('/api/rescue/create-rescue')
      .send({ user: userData, rescue: rescueData })

    expect(response.status).toBe(500)
    expect(response.body.message).toBe('Error creating rescue account')
    expect(response.body.error).toBe('Service error')
  })
})
