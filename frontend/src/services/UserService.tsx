import axios from 'axios';
import { User } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UserService = {
	fetchAdminUsers: async (): Promise<User[]> => {
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

	deleteAdminUser: async (user_id: string): Promise<void> => {
		try {
			await axios.delete(`${API_BASE_URL}/admin/users/delete/${user_id}`, {
				withCredentials: true,
			});
		} catch (error) {
			console.error('Failed to delete user:', error);
			throw error;
		}
	},

	resetAdminUserPassword: async (user_id: string): Promise<void> => {
		try {
			await axios.post(
				`${API_BASE_URL}/admin/users/reset-password/${user_id}`,
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
