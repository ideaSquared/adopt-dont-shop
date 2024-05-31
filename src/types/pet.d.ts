// src/types/pet.d.ts

export interface Pet {
	pet_id: string;
	images: string[];
	name: string;
	type: string;
	status: string;
	ownerInfo?: string;
	age: number;
	gender: string;
	distance?: number;
	short_description: string;
	long_description: string;
}
