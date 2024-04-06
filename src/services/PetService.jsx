import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_BASE_URL;

export const fetchPets = async (rescueId) => {
	const response = await axios.get(`${apiUrl}/pets/owner/${rescueId}`, {
		withCredentials: true,
	});
	return response.data;
};

export const getPetById = async (petId) => {
	try {
		const response = await axios.get(`${apiUrl}/pets/${petId}`);
		return response.data; // Assuming the API returns the pet details directly
	} catch (error) {
		console.error('Error fetching pet by ID:', error);
		throw error; // Rethrow or handle as needed
	}
};

export const createOrUpdatePet = async (pet, isEditMode) => {
	if (isEditMode) {
		return axios.put(`${apiUrl}/pets/${pet._id}`, pet, {
			withCredentials: true,
		});
	} else {
		return axios.post(`${apiUrl}/pets`, pet, { withCredentials: true });
	}
};

export const deletePet = async (petId) => {
	return axios.delete(`${apiUrl}/pets/${petId}`, { withCredentials: true });
};

export const uploadPetImages = async (petId, images) => {
	const formData = new FormData();
	images.forEach((image) => {
		formData.append('images', image);
	});

	return axios.post(`${apiUrl}/pets/${petId}/images`, formData, {
		withCredentials: true,
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	});
};
