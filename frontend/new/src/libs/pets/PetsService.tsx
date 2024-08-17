import { Pet, PetRescue } from './Pets';

const pets: PetRescue[] = [
	{
		pet_id: '101',
		images: ['image1.jpg'],
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
		images: ['image2.jpg'],
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
];

const getPets = (): Pet[] | PetRescue[] => pets;

const getPetById = (pet_id: string): Pet | PetRescue | undefined =>
	pets.find((pet) => pet.pet_id === pet_id);

const getPetsByType = (type: string): Pet[] | PetRescue[] =>
	pets.filter((pet) => pet.type.toLowerCase() === type.toLowerCase());

export default {
	getPets,
	getPetById,
	getPetsByType,
};
