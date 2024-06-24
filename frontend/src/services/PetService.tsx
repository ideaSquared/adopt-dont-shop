import axios, { AxiosResponse } from 'axios';
import { Pet } from '../types/pet';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL as string;

const PetService = {
	fetchPets: async (rescueId: string): Promise<Pet[]> => {
		try {
			const response: AxiosResponse<Pet[]> = await axios.get(
				`${API_BASE_URL}/pets/owner/${rescueId}`,
				{
					withCredentials: true,
				}
			);
			return response.data;
		} catch (error) {
			console.error('Failed to fetch pets:', error);
			throw error;
		}
	},

	fetchAllPets: async (): Promise<Pet[]> => {
		try {
			const response: AxiosResponse<Pet[]> = await axios.get(
				`${API_BASE_URL}/admin/pets`,
				{
					withCredentials: true,
				}
			);
			return response.data;
		} catch (error) {
			console.error('Failed to fetch pets:', error);
			throw error;
		}
	},

	getPetById: async (petId: string): Promise<Pet> => {
		try {
			const response: AxiosResponse<Pet> = await axios.get(
				`${API_BASE_URL}/pets/${petId}`
			);
			return response.data;
		} catch (error) {
			console.error('Error fetching pet by ID:', error);
			throw error;
		}
	},

	createOrUpdatePet: async (pet: Pet, isEditMode: boolean): Promise<Pet> => {
		try {
			const response: AxiosResponse<Pet> = isEditMode
				? await axios.put(`${API_BASE_URL}/pets/${pet.pet_id}`, pet, {
						withCredentials: true,
				  })
				: await axios.post(`${API_BASE_URL}/pets`, pet, {
						withCredentials: true,
				  });
			return response.data;
		} catch (error) {
			console.error('Error creating or updating pet:', error);
			throw error;
		}
	},

	deletePet: async (petId: string): Promise<void> => {
		try {
			await axios.delete(`${API_BASE_URL}/pets/${petId}`, {
				withCredentials: true,
			});
		} catch (error) {
			console.error('Failed to delete pet:', error);
			throw error;
		}
	},

	uploadPetImages: async (petId: string, images: File[]): Promise<string[]> => {
		try {
			const formData: FormData = new FormData();
			images.forEach((image) => {
				formData.append('images', image);
			});

			const response: AxiosResponse<{ filenames: string[] }> = await axios.post(
				`${API_BASE_URL}/pets/${petId}/images`,
				formData,
				{
					withCredentials: true,
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				}
			);
			return response.data.filenames;
		} catch (error) {
			console.error('Failed to upload pet images:', error);
			throw error;
		}
	},

	deletePetImages: async (
		petId: string,
		imagesToDelete: string[]
	): Promise<void> => {
		try {
			const response: AxiosResponse<void> = await axios.delete(
				`${API_BASE_URL}/pets/${petId}/images`,
				{
					data: { imagesToDelete }, // Axios expects the request payload in a data property for DELETE requests
					withCredentials: true,
				}
			);
			return response.data;
		} catch (error) {
			console.error('Failed to delete pet images:', error);
			throw error;
		}
	},
};

export default PetService;
