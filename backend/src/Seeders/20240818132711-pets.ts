import { QueryInterface, QueryTypes } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const rescues = await queryInterface.sequelize.query<{ rescue_id: string }>(
    `SELECT rescue_id FROM rescues`,
    { type: QueryTypes.SELECT },
  )

  const pets = [
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Buddy',
      owner_id: rescues[0]?.rescue_id, // First rescue
      short_description: 'Friendly and energetic dog',
      long_description:
        'Buddy is a very friendly and energetic dog who loves to play.',
      age: 3,
      gender: 'Male',
      status: 'Available',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Mittens',
      owner_id: rescues[1]?.rescue_id, // Second rescue
      short_description: 'Calm and affectionate cat',
      long_description:
        'Mittens is a calm and affectionate cat who loves to cuddle.',
      age: 2,
      gender: 'Female',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Charlie',
      owner_id: rescues[0]?.rescue_id,
      short_description: 'Loyal and protective dog',
      long_description:
        'Charlie is a loyal and protective dog, perfect for a family.',
      age: 5,
      gender: 'Male',
      status: 'Adopted',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Luna',
      owner_id: rescues[1]?.rescue_id,
      short_description: 'Playful kitten with lots of energy',
      long_description:
        'Luna is a playful kitten who enjoys chasing toys and climbing.',
      age: 1,
      gender: 'Female',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Max',
      owner_id: rescues[0]?.rescue_id,
      short_description: 'Adventurous and curious dog',
      long_description:
        'Max loves going on adventures and exploring new places.',
      age: 4,
      gender: 'Male',
      status: 'Available',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Bella',
      owner_id: rescues[1]?.rescue_id,
      short_description: 'Gentle and loving cat',
      long_description: 'Bella is gentle and loves spending time with people.',
      age: 3,
      gender: 'Female',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Rocky',
      owner_id: rescues[0]?.rescue_id,
      short_description: 'Strong and brave dog',
      long_description: 'Rocky is strong and brave, great for an active owner.',
      age: 6,
      gender: 'Male',
      status: 'Adopted',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Chloe',
      owner_id: rescues[1]?.rescue_id,
      short_description: 'Curious and playful kitten',
      long_description:
        'Chloe is a curious kitten who loves exploring and playing.',
      age: 1,
      gender: 'Female',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Daisy',
      owner_id: rescues[0]?.rescue_id,
      short_description: 'Loving dog with a big heart',
      long_description: 'Daisy is loving and has a big heart for her family.',
      age: 3,
      gender: 'Female',
      status: 'Available',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Oliver',
      owner_id: rescues[1]?.rescue_id,
      short_description: 'Intelligent and independent cat',
      long_description:
        'Oliver is intelligent and independent, perfect for a quiet home.',
      age: 4,
      gender: 'Male',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    // 10 more pets
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Lily',
      owner_id: rescues[0]?.rescue_id,
      short_description: 'Friendly dog who loves people',
      long_description: 'Lily is very friendly and loves meeting new people.',
      age: 2,
      gender: 'Female',
      status: 'Available',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Simba',
      owner_id: rescues[1]?.rescue_id,
      short_description: 'Energetic and playful cat',
      long_description: 'Simba is always full of energy and loves playing.',
      age: 3,
      gender: 'Male',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Milo',
      owner_id: rescues[0]?.rescue_id,
      short_description: 'Adventurous dog who loves the outdoors',
      long_description:
        'Milo is an adventurous dog who loves hiking and exploring.',
      age: 4,
      gender: 'Male',
      status: 'Available',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Lucy',
      owner_id: rescues[1]?.rescue_id,
      short_description: 'Gentle and quiet cat',
      long_description:
        'Lucy is gentle and quiet, perfect for a peaceful home.',
      age: 5,
      gender: 'Female',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Oscar',
      owner_id: rescues[0]?.rescue_id,
      short_description: 'Loyal and protective dog',
      long_description:
        'Oscar is a loyal dog who will protect his family at all costs.',
      age: 6,
      gender: 'Male',
      status: 'Adopted',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Molly',
      owner_id: rescues[1]?.rescue_id,
      short_description: 'Loving cat who enjoys cuddles',
      long_description:
        'Molly is a loving cat who enjoys spending time on laps.',
      age: 2,
      gender: 'Female',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Duke',
      owner_id: rescues[0]?.rescue_id,
      short_description: 'Strong and brave dog',
      long_description: 'Duke is strong and brave, great for an active family.',
      age: 5,
      gender: 'Male',
      status: 'Adopted',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Nala',
      owner_id: rescues[1]?.rescue_id,
      short_description: 'Curious and playful cat',
      long_description:
        'Nala is curious and enjoys exploring her surroundings.',
      age: 1,
      gender: 'Female',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Zoe',
      owner_id: rescues[0]?.rescue_id,
      short_description: 'Friendly dog with lots of energy',
      long_description: 'Zoe is full of energy and loves playing fetch.',
      age: 3,
      gender: 'Female',
      status: 'Available',
      type: 'Dog',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      pet_id: 'pet_' + Math.random().toString(36).slice(2, 12),
      name: 'Shadow',
      owner_id: rescues[1]?.rescue_id,
      short_description: 'Mysterious and independent cat',
      long_description: 'Shadow is mysterious and enjoys spending time alone.',
      age: 4,
      gender: 'Male',
      status: 'Available',
      type: 'Cat',
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]

  await queryInterface.bulkInsert('pets', pets)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('pets', {})
}

