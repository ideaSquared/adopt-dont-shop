import { QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
  await queryInterface.sequelize.query(`
    INSERT INTO rescues 
    (rescue_id, rescue_name, rescue_type, created_at, updated_at)
    VALUES
    ('rescue_' || left(md5(random()::text), 12), 'Demo Rescue', 'Animal Shelter', NOW(), NOW());
  `)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('rescues', {})
}
