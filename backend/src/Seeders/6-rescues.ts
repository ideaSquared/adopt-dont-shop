import { QueryInterface } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const rescues = [
    {
      rescue_id: 'rescue_' + Math.random().toString(36).slice(2, 12),
      rescue_name: 'Happy Tails Animal Shelter',
      rescue_type: 'charity',
      reference_number: 'HT123456',
      reference_number_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
      address_line_1: '123 Animal St',
      address_line_2: null,
      city: 'Tail Town',
      county: 'Paw County',
      postcode: 'TAIL123',
      country: 'USA',
      location: null,
    },
    {
      rescue_id: 'rescue_' + Math.random().toString(36).slice(2, 12),
      rescue_name: 'Safe Haven Pet Rescue',
      rescue_type: 'company',
      reference_number: 'SH789101',
      reference_number_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
      address_line_1: '456 Safe Haven Ave',
      address_line_2: null,
      city: 'Safe City',
      county: 'Safe County',
      postcode: 'SAFE789',
      country: 'USA',
      location: null,
    },
  ]

  await queryInterface.bulkInsert('rescues', rescues)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('rescues', {
    rescue_name: ['Happy Tails Animal Shelter', 'Safe Haven Pet Rescue'],
  })
}

