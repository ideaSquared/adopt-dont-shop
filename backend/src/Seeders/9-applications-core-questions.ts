import { QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
  await queryInterface.sequelize.query(`
    INSERT INTO application_core_questions 
    (question_key, category, question_type, question_text, options, is_enabled, is_required, created_at, updated_at)
    VALUES
    -- Personal Information
    ('full_name', 'PERSONAL_INFORMATION', 'TEXT', 'Full Name', NULL, true, true, NOW(), NOW()),
    ('email', 'PERSONAL_INFORMATION', 'EMAIL', 'Email Address', NULL, true, true, NOW(), NOW()),
    ('phone', 'PERSONAL_INFORMATION', 'PHONE', 'Phone Number', NULL, true, true, NOW(), NOW()),
    ('address', 'PERSONAL_INFORMATION', 'ADDRESS', 'Address (including city, state, country, and postal code)', NULL, true, true, NOW(), NOW()),
    ('age', 'PERSONAL_INFORMATION', 'NUMBER', 'Age (to verify minimum age requirement for adoption)', NULL, true, true, NOW(), NOW()),
    ('preferred_contact', 'PERSONAL_INFORMATION', 'SELECT', 'Preferred Contact Method', ARRAY['Phone', 'Email', 'Text'], true, true, NOW(), NOW()),

    -- Household Information
    ('home_type', 'HOUSEHOLD_INFORMATION', 'SELECT', 'What type of home do you live in?', ARRAY['House', 'Apartment', 'Condo', 'Other'], true, true, NOW(), NOW()),
    ('home_ownership', 'HOUSEHOLD_INFORMATION', 'SELECT', 'Do you own or rent your home?', ARRAY['Own', 'Rent'], true, true, NOW(), NOW()),
    ('landlord_permission', 'HOUSEHOLD_INFORMATION', 'BOOLEAN', 'If renting, do you have permission to have pets?', NULL, true, false, NOW(), NOW()),
    ('yard_size', 'HOUSEHOLD_INFORMATION', 'SELECT', 'What is the size of your yard?', ARRAY['No yard', 'Small', 'Medium', 'Large'], true, true, NOW(), NOW()),
    ('household_members', 'HOUSEHOLD_INFORMATION', 'TEXT', 'Who lives in your household? (List all residents and their ages)', NULL, true, true, NOW(), NOW()),
    ('children_ages', 'HOUSEHOLD_INFORMATION', 'TEXT', 'If you have children, what are their ages?', NULL, true, false, NOW(), NOW()),
    ('allergies', 'HOUSEHOLD_INFORMATION', 'BOOLEAN', 'Do any household members have pet allergies?', NULL, true, true, NOW(), NOW()),
    ('household_agreement', 'HOUSEHOLD_INFORMATION', 'BOOLEAN', 'Does everyone in your household agree to adopting this pet?', NULL, true, true, NOW(), NOW()),
    ('fenced_yard', 'HOUSEHOLD_INFORMATION', 'TEXT', 'Do you have a fenced yard? (If adopting a dog, specify fence height and type)', NULL, true, false, NOW(), NOW()),

    -- Pet Ownership Experience
    ('previous_pets', 'PET_OWNERSHIP_EXPERIENCE', 'TEXT', 'Have you owned pets before? (If yes, what types?)', NULL, true, true, NOW(), NOW()),
    ('current_pets', 'PET_OWNERSHIP_EXPERIENCE', 'BOOLEAN', 'Do you have any current pets?', NULL, true, true, NOW(), NOW()),
    ('current_pet_details', 'PET_OWNERSHIP_EXPERIENCE', 'TEXT', 'If yes, please describe your current pets', NULL, true, false, NOW(), NOW()),
    ('surrendered_pets', 'PET_OWNERSHIP_EXPERIENCE', 'TEXT', 'Have you ever surrendered or rehomed a pet? (If yes, why?)', NULL, true, true, NOW(), NOW()),
    ('primary_caregiver', 'PET_OWNERSHIP_EXPERIENCE', 'TEXT', 'Who will be the primary caregiver for the pet?', NULL, true, true, NOW(), NOW()),
    ('training_experience', 'PET_OWNERSHIP_EXPERIENCE', 'SELECT', 'How much experience do you have with training pets?', ARRAY['Beginner', 'Intermediate', 'Advanced'], true, true, NOW(), NOW()),
    ('pet_experience', 'PET_OWNERSHIP_EXPERIENCE', 'MULTI_SELECT', 'What is your experience with pets?', ARRAY['First-time pet owner', 'Previous pet owner', 'Current pet owner', 'Professional experience'], true, true, NOW(), NOW()),

    -- Pet Care Commitment
    ('veterinarian', 'PET_CARE_COMMITMENT', 'BOOLEAN', 'Do you have a veterinarian?', NULL, true, true, NOW(), NOW()),
    ('vet_name', 'PET_CARE_COMMITMENT', 'TEXT', 'If yes, please provide your veterinarian''s name and contact information', NULL, true, false, NOW(), NOW()),
    ('exercise_plan', 'PET_CARE_COMMITMENT', 'TEXT', 'How do you plan to exercise the pet?', NULL, true, true, NOW(), NOW()),

    -- Lifestyle Compatibility
    ('daily_schedule', 'LIFESTYLE_COMPATIBILITY', 'TEXT', 'Describe your typical daily schedule', NULL, true, true, NOW(), NOW()),
    ('time_alone', 'LIFESTYLE_COMPATIBILITY', 'NUMBER', 'How many hours will the pet be alone during the day?', NULL, true, true, NOW(), NOW()),

    -- References Verification
    ('emergency_contact', 'REFERENCES_VERIFICATION', 'TEXT', 'Emergency contact name and phone number', NULL, true, true, NOW(), NOW());
  `)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('application_core_questions', {})
}
