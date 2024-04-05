import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_BASE_URL;

export const fetchPets = async (rescueId) => {
	const response = await axios.get(`${apiUrl}/pets/owner/${rescueId}`, {
		withCredentials: true,
	});
	return response.data;
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
