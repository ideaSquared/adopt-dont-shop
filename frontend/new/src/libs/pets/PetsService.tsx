import { Pet, PetRescue } from './Pets'

const pets: PetRescue[] = [
  {
    pet_id: '101',
    images: ['https://placecats.com/300/200'],
    name: 'Max',
    type: 'Dog',
    status: 'Available',
    age: 4,
    gender: 'Male',
    short_description: 'Friendly and energetic',
    long_description:
      'Max is a friendly and energetic dog looking for a loving home.',
    breed: 'Labrador Retriever',
    vaccination_status: 'Up-to-date',
    temperament: 'Friendly',
    health: 'Good',
    owner_id: '1',
    size: 'Large',
    grooming_needs: 'Moderate',
    training_socialization: 'Well trained',
    commitment_level: 'High',
    other_pets: 'Gets along well',
    household: 'Suitable for families',
    energy: 'High',
    family: 'Good with kids',
    application_count: 3,
  },
  {
    pet_id: '102',
    images: ['https://placecats.com/300/200'],
    name: 'Bella',
    type: 'Cat',
    status: 'Adopted',
    age: 2,
    gender: 'Female',
    short_description: 'Calm and affectionate',
    long_description:
      'Bella is a calm and affectionate cat who enjoys quiet environments.',
    breed: 'Siamese',
    vaccination_status: 'Up-to-date',
    temperament: 'Calm',
    owner_id: '1',
    health: 'Good',
    size: 'Medium',
    grooming_needs: 'Low',
    training_socialization: 'House trained',
    commitment_level: 'Moderate',
    other_pets: 'Best as an only pet',
    household: 'Suitable for single adults',
    energy: 'Low',
    family: 'Best with adults',
    application_count: 1,
  },
  {
    pet_id: '103',
    images: ['https://placecats.com/300/200'],
    name: 'Charlie',
    type: 'Dog',
    status: 'Available',
    age: 3,
    gender: 'Male',
    short_description: 'Loyal and playful',
    long_description:
      'Charlie is a loyal and playful dog, perfect for an active household.',
    breed: 'Beagle',
    vaccination_status: 'Up-to-date',
    temperament: 'Playful',
    health: 'Good',
    owner_id: '2',
    size: 'Medium',
    grooming_needs: 'Low',
    training_socialization: 'Well trained',
    commitment_level: 'Moderate',
    other_pets: 'Good with other dogs',
    household: 'Suitable for active families',
    energy: 'Medium',
    family: 'Good with kids',
    application_count: 2,
  },
  {
    pet_id: '104',
    images: ['https://placecats.com/300/200'],
    name: 'Luna',
    type: 'Cat',
    status: 'Available',
    age: 1,
    gender: 'Female',
    short_description: 'Curious and playful',
    long_description:
      'Luna is a curious and playful kitten looking for a forever home.',
    breed: 'Maine Coon',
    vaccination_status: 'Up-to-date',
    temperament: 'Curious',
    health: 'Good',
    owner_id: '2',
    size: 'Large',
    grooming_needs: 'High',
    training_socialization: 'Litter trained',
    commitment_level: 'Moderate',
    other_pets: 'Good with other cats',
    household: 'Suitable for families',
    energy: 'High',
    family: 'Good with kids',
    application_count: 1,
  },
  {
    pet_id: '105',
    images: ['https://placecats.com/300/200'],
    name: 'Rocky',
    type: 'Dog',
    status: 'Adopted',
    age: 5,
    gender: 'Male',
    short_description: 'Strong and protective',
    long_description:
      'Rocky is a strong and protective dog, ideal for an experienced owner.',
    breed: 'German Shepherd',
    vaccination_status: 'Up-to-date',
    temperament: 'Protective',
    health: 'Excellent',
    owner_id: '3',
    size: 'Large',
    grooming_needs: 'Moderate',
    training_socialization: 'Highly trained',
    commitment_level: 'High',
    other_pets: 'Best as an only pet',
    household: 'Suitable for single owners',
    energy: 'High',
    family: 'Not suitable for young children',
    application_count: 4,
  },
  {
    pet_id: '106',
    images: ['https://placecats.com/300/200'],
    name: 'Milo',
    type: 'Rabbit',
    status: 'Available',
    age: 1,
    gender: 'Male',
    short_description: 'Gentle and quiet',
    long_description: 'Milo is a gentle rabbit who enjoys a quiet environment.',
    breed: 'Dutch',
    vaccination_status: 'Up-to-date',
    temperament: 'Gentle',
    health: 'Good',
    owner_id: '4',
    size: 'Small',
    grooming_needs: 'Low',
    training_socialization: 'Litter trained',
    commitment_level: 'Low',
    other_pets: 'Good with other small animals',
    household: 'Suitable for families',
    energy: 'Low',
    family: 'Good with kids',
    application_count: 0,
  },
  {
    pet_id: '107',
    images: ['https://placecats.com/300/200'],
    name: 'Daisy',
    type: 'Dog',
    status: 'Available',
    age: 6,
    gender: 'Female',
    short_description: 'Loving and calm',
    long_description:
      'Daisy is a loving and calm dog who enjoys a peaceful home environment.',
    breed: 'Golden Retriever',
    vaccination_status: 'Up-to-date',
    temperament: 'Calm',
    health: 'Good',
    owner_id: '5',
    size: 'Large',
    grooming_needs: 'High',
    training_socialization: 'Well trained',
    commitment_level: 'Moderate',
    other_pets: 'Good with other dogs',
    household: 'Suitable for all ages',
    energy: 'Low',
    family: 'Good with kids',
    application_count: 2,
  },
  {
    pet_id: '108',
    images: ['https://placecats.com/300/200'],
    name: 'Oliver',
    type: 'Cat',
    status: 'Available',
    age: 3,
    gender: 'Male',
    short_description: 'Independent and curious',
    long_description:
      'Oliver is an independent cat who enjoys exploring and lounging around.',
    breed: 'Tabby',
    vaccination_status: 'Up-to-date',
    temperament: 'Curious',
    health: 'Good',
    owner_id: '5',
    size: 'Medium',
    grooming_needs: 'Low',
    training_socialization: 'Litter trained',
    commitment_level: 'Low',
    other_pets: 'Good with other cats',
    household: 'Suitable for single adults',
    energy: 'Medium',
    family: 'Best with adults',
    application_count: 3,
  },
]

const getPets = (): Pet[] | PetRescue[] => pets

const getPetById = (pet_id: string): Pet | PetRescue | undefined =>
  pets.find((pet) => pet.pet_id === pet_id)

const getPetsByType = (type: string): Pet[] | PetRescue[] =>
  pets.filter((pet) => pet.type.toLowerCase() === type.toLowerCase())

export default {
  getPets,
  getPetById,
  getPetsByType,
}
