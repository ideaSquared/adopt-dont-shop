import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PetService = {
	fetchPets: async (rescueId) => {
		try {
			const response = await axios.get(
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

	fetchAllPets: async () => {
		try {
			const response = await axios.get(`${API_BASE_URL}/admin/pets`, {
				withCredentials: true,
			});
			return response.data;
		} catch (error) {
			console.error('Failed to fetch pets:', error);
			throw error;
		}
	},

	getPetById: async (petId) => {
		try {
			const response = await axios.get(`${API_BASE_URL}/pets/${petId}`);
			return response.data;
		} catch (error) {
			console.error('Error fetching pet by ID:', error);
			throw error;
		}
	},

	createOrUpdatePet: async (pet, isEditMode) => {
		try {
			const response = isEditMode
				? await axios.put(`${API_BASE_URL}/pets/${pet._id}`, pet, {
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

	deletePet: async (petId) => {
		try {
			await axios.delete(`${API_BASE_URL}/pets/${petId}`, {
				withCredentials: true,
			});
		} catch (error) {
			console.error('Failed to delete pet:', error);
			throw error;
		}
	},

	uploadPetImages: async (petId, images) => {
		try {
			const formData = new FormData();
			images.forEach((image) => {
				formData.append('images', image);
			});

			const response = await axios.post(
				`${API_BASE_URL}/pets/${petId}/images`,
				formData,
				{
					withCredentials: true,
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				}
			);
			return response.data;
		} catch (error) {
			console.error('Failed to upload pet images:', error);
			throw error;
		}
	},

	deletePetImages: async (petId, imagesToDelete) => {
		try {
			const response = await axios.delete(
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
