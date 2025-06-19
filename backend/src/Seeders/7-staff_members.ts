import { QueryInterface, QueryTypes } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const users = await queryInterface.sequelize.query<{
    user_id: string
    email: string
  }>(`SELECT user_id, email FROM users`, { type: QueryTypes.SELECT })

  const rescues = await queryInterface.sequelize.query<{ rescue_id: string }>(
    `SELECT rescue_id FROM rescues`,
    { type: QueryTypes.SELECT },
  )

  const staffMembers = [
    {
      staff_member_id:
        'staff_member_' + Math.random().toString(36).slice(2, 12),
      user_id: users.find((u) => u.email === 'rescue.manager@example.com')
        ?.user_id,
      verified_by_rescue: true,
      rescue_id: rescues[0]?.rescue_id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      staff_member_id:
        'staff_member_' + Math.random().toString(36).slice(2, 12),
      user_id: users.find((u) => u.email === 'pet.manager@example.com')
        ?.user_id,
      verified_by_rescue: true,
      rescue_id: rescues[0]?.rescue_id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      staff_member_id:
        'staff_member_' + Math.random().toString(36).slice(2, 12),
      user_id: users.find((u) => u.email === 'staff.user@example.com')?.user_id,
      verified_by_rescue: true,
      rescue_id: rescues[1]?.rescue_id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      staff_member_id:
        'staff_member_' + Math.random().toString(36).slice(2, 12),
      user_id: users.find((u) => u.email === 'staff.verifieduser@example.com')
        ?.user_id,
      verified_by_rescue: true,
      rescue_id: rescues[1]?.rescue_id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      staff_member_id:
        'staff_member_' + Math.random().toString(36).slice(2, 12),
      user_id: users.find((u) => u.email === 'rescue.manager2@example.com')
        ?.user_id,
      verified_by_rescue: true,
      rescue_id: rescues[1]?.rescue_id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]

  await queryInterface.bulkInsert('staff_members', staffMembers)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('staff_members', {})
}
