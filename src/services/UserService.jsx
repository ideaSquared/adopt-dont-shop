// UserService.jsx
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UserService = {
	fetchAdminUsers: async () => {
		try {
			const response = await axios.get(`${API_BASE_URL}/admin/users`, {
				withCredentials: true,
			});
			return response.data;
		} catch (error) {
			console.error('Failed to fetch users:', error);
			throw error;
		}
	},

	deleteAdminUser: async (userId) => {
		try {
			await axios.delete(`${API_BASE_URL}/admin/users/delete/${userId}`, {
				withCredentials: true,
			});
		} catch (error) {
			console.error('Failed to delete user:', error);
			throw error;
		}
	},

	resetAdminUserPassword: async (userId) => {
		try {
			await axios.post(
				`${API_BASE_URL}/admin/users/reset-password/${userId}`,
				{},
				{ withCredentials: true }
			);
		} catch (error) {
			console.error('Failed to reset user password:', error);
			throw error;
		}
	},
};

export default UserService;
