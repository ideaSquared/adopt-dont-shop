import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AuthService = {
	login: async (email, password) => {
		return axios.post(
			`${API_BASE_URL}/auth/login`,
			{ email, password },
			{ withCredentials: true }
		);
	},

	logout: async () => {
		return axios.post(
			`${API_BASE_URL}/auth/logout`,
			{},
			{ withCredentials: true }
		);
	},

	checkLoginStatus: async () => {
		return axios.get(`${API_BASE_URL}/auth/status`, { withCredentials: true });
	},

	fetchPermissions: async () => {
		return axios.get(`${API_BASE_URL}/auth/permissions`, {
			withCredentials: true,
		});
	},

	checkRescueRoute: async () => {
		return axios.get(`${API_BASE_URL}/auth/my-rescue`, {
			withCredentials: true,
		});
	},

	verifyEmail: async (token) => {
		return axios.get(`${API_BASE_URL}/auth/verify-email?token=${token}`);
	},

	resetPassword: async (token, newPassword) => {
		return axios.post(
			`${API_BASE_URL}/auth/reset-password`,
			{ token, newPassword },
			{ withCredentials: true }
		);
	},

	sendForgotPasswordEmail: async (email) => {
		return axios.post(
			`${API_BASE_URL}/auth/forgot-password`,
			{ email },
			{ withCredentials: true }
		);
	},

	createAccountUser: async (userData) => {
		return axios.post(`${API_BASE_URL}/auth/register`, userData, {
			withCredentials: true,
		});
	},

	createAccountRescue: async (
		firstName,
		email,
		password,
		rescueType,
		rescueName,
		rescueAddress
	) => {
		// Construct the data object to be sent in the POST request body
		const postData = {
			firstName,
			email,
			password,
			rescueName,
			rescueAddress,
			rescueType,
		};

		try {
			// Execute the POST request using axios
			const response = await axios.post(
				`${API_BASE_URL}/rescue/${rescueType.toLowerCase()}`,
				postData
			);

			// Return the response data or any other relevant information from the response
			return response.data;
		} catch (error) {
			// Handle any errors that occur during the API request
			console.error(
				'Error creating rescue account:',
				error.response ? error.response.data : error.message
			);

			// Optionally, throw the error or return a specific error message to be handled by the caller
			throw error;
		}
	},
};

export default AuthService;
