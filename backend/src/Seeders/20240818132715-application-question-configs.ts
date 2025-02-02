import { QueryInterface, QueryTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
  const rescues = await queryInterface.sequelize.query<{ rescue_id: string }>(
    `SELECT rescue_id FROM rescues LIMIT 1`,
    { type: QueryTypes.SELECT },
  )

  if (rescues.length === 0) {
    throw new Error('No rescues found in the database')
  }

  const rescueId = rescues[0].rescue_id

  await queryInterface.sequelize.query(
    `
    INSERT INTO application_question_configs 
    (config_id, rescue_id, question_key, question_text, question_type, category, options, is_required, is_enabled, created_at, updated_at)
    VALUES
    ('config_' || left(md5(random()::text), 12), :rescueId, 'home_type', 'What type of home do you live in?', 'SELECT', 'HOUSEHOLD_INFORMATION', ARRAY['House', 'Apartment', 'Condo', 'Other'], true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'home_ownership', 'Do you own or rent your home?', 'SELECT', 'HOUSEHOLD_INFORMATION', ARRAY['Own', 'Rent'], true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'landlord_permission', 'If renting, do you have permission to have pets?', 'BOOLEAN', 'HOUSEHOLD_INFORMATION', NULL, false, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'yard_size', 'What is the size of your yard?', 'SELECT', 'HOUSEHOLD_INFORMATION', ARRAY['No yard', 'Small', 'Medium', 'Large'], true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'household_members', 'How many people live in your household?', 'NUMBER', 'HOUSEHOLD_INFORMATION', NULL, true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'children_ages', 'If you have children, what are their ages?', 'TEXT', 'HOUSEHOLD_INFORMATION', NULL, false, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'current_pets', 'Do you have any current pets?', 'BOOLEAN', 'PET_OWNERSHIP_EXPERIENCE', NULL, true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'current_pet_details', 'If yes, please describe your current pets', 'TEXT', 'PET_OWNERSHIP_EXPERIENCE', NULL, false, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'pet_experience', 'What is your experience with pets?', 'MULTI_SELECT', 'PET_OWNERSHIP_EXPERIENCE', ARRAY['First-time pet owner', 'Previous pet owner', 'Current pet owner', 'Professional experience'], true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'veterinarian', 'Do you have a veterinarian?', 'BOOLEAN', 'PET_CARE_COMMITMENT', NULL, true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'vet_name', 'If yes, please provide your veterinarian''s name and contact information', 'TEXT', 'PET_CARE_COMMITMENT', NULL, false, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'exercise_plan', 'How do you plan to exercise the pet?', 'TEXT', 'PET_CARE_COMMITMENT', NULL, true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'daily_schedule', 'Describe your typical daily schedule', 'TEXT', 'LIFESTYLE_COMPATIBILITY', NULL, true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'time_alone', 'How many hours will the pet be alone during the day?', 'NUMBER', 'LIFESTYLE_COMPATIBILITY', NULL, true, true, NOW(), NOW()),
    ('config_' || left(md5(random()::text), 12), :rescueId, 'emergency_contact', 'Emergency contact name and phone number', 'TEXT', 'REFERENCES_VERIFICATION', NULL, true, true, NOW(), NOW());
  `,
    {
      replacements: { rescueId },
    },
  )
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('application_question_configs', {})
}
