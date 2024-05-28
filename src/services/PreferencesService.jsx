import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PreferencesService = {
	fetchUserPreferences: async () => {
		try {
			const response = await axios.get(`${API_BASE_URL}/preferences/user`, {
				withCredentials: true,
			});
			return response.data;
		} catch (error) {
			console.error('Failed to fetch user preferences:', error);
			throw error;
		}
	},

	addPreference: async (preference) => {
		try {
			const response = await axios.post(
				`${API_BASE_URL}/preferences`,
				preference,
				{
					withCredentials: true,
				}
			);
			return response.data;
		} catch (error) {
			console.error('Failed to add preference:', error);
			throw error;
		}
	},

	updatePreference: async (id, preference) => {
		try {
			const response = await axios.put(
				`${API_BASE_URL}/preferences/${id}`,
				preference,
				{
					withCredentials: true,
				}
			);
			return response.data;
		} catch (error) {
			console.error('Failed to update preference:', error);
			throw error;
		}
	},

	deletePreference: async (id) => {
		try {
			await axios.delete(`${API_BASE_URL}/preferences/${id}`, {
				withCredentials: true,
			});
		} catch (error) {
			console.error('Failed to delete preference:', error);
			throw error;
		}
	},

	fetchAllPreferences: async () => {
		try {
			const response = await axios.get(`${API_BASE_URL}/preferences`, {
				withCredentials: true,
			});
			return response.data;
		} catch (error) {
			console.error('Failed to fetch all preferences:', error);
			throw error;
		}
	},
};

export default PreferencesService;
