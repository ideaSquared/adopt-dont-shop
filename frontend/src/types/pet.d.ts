// src/types/pet.d.ts

export interface Pet {
	pet_id: string;
	images: string[];
	name: string;
	type: string;
	status: string;
	age: number | string;
	gender: string;
	short_description: string;
	long_description: string;
	ownerInfo?: string;
	distance?: number;
	breed: string;
	vaccination_status: string;
	temperament: string;
	health: string;
	size: string;
	grooming_needs: string;
	training_socialization: string;
	commitment_level: string;
	other_pets: string;
	household: string;
	energy: string;
	family: string;
	ratings?: {
		love: number;
		like: number;
		dislike: number;
	};
	application_count?: number;
}
