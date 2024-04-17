import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AuthService = {
	login: async (email, password) => {
		try {
			// Correctly await the Axios call to ensure we have a response to work with.
			const response = await axios.post(
				`${API_BASE_URL}/auth/login`,
				{ email, password },
				{ withCredentials: true }
			);

			// Assuming Axios throws for non-2xx statuses, this line might not execute for such responses,
			// so we handle non-2xx statuses in the catch block below.
			return response;
		} catch (error) {
			// Log the error for debugging purposes.
			console.error(
				'Error logging in user',
				error.response ? error.response.data : error
			);

			// console.log(error);

			// if (
			// 	error.response.status === 401 &&
			// 	error.response.data.message ===
			// 		'Email does not exist or password is not correct.'
			// ){
			// 	verifyEmail();
			// }
			// Handle or rethrow the error as needed. This could be a place to standardize error responses
			// or extract meaningful error messages for the UI.
			// Ensure to return or throw something meaningful here to avoid unhandled promise rejections.
			throw new Error(
				error.response?.data.message || 'An error occurred during login.'
			);
		}
	},

	logout: async () => {
		try {
			// Execute the POST request using axios
			const response = axios.post(
				`${API_BASE_URL}/auth/logout`,
				{},
				{ withCredentials: true }
			);
			// Return the response data or any other relevant information from the response
			return response;
		} catch (error) {
			// Handle any errors that occur during the API request
			console.error(
				'Error logging user out',
				error.response ? error.response.data : error.message
			);

			return error;
		}
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
		try {
			// Execute the POST request using axios
			const response = axios.get(
				`${API_BASE_URL}/auth/verify-email?token=${token}`
			);

			// Return the response data or any other relevant information from the response
			return response;
		} catch (error) {
			// Handle any errors that occur during the API request
			console.error(
				'Error verifying email',
				error.response ? error.response.data : error.message
			);

			return error;
		}
	},

	resetPassword: async (token, newPassword) => {
		try {
			// Execute the POST request using axios
			const response = axios.post(
				`${API_BASE_URL}/auth/reset-password`,
				{ token, newPassword },
				{ withCredentials: true }
			);

			// Return the response data or any other relevant information from the response
			return response;
		} catch (error) {
			// Handle any errors that occur during the API request
			console.error(
				'Error sending forgot password email:',
				error.response ? error.response.data : error.message
			);

			return error;
		}
	},

	sendForgotPasswordEmail: async (email) => {
		try {
			// Execute the POST request using axios
			const response = axios.post(
				`${API_BASE_URL}/auth/forgot-password`,
				{ email },
				{ withCredentials: true }
			);

			// Return the response data or any other relevant information from the response
			return response;
		} catch (error) {
			// Handle any errors that occur during the API request
			console.error(
				'Error sending forgot password email:',
				error.response ? error.response.data : error.message
			);

			return error;
		}
	},

	getUserDetails: async (token) => {
		try {
			const response = axios.get(`${API_BASE_URL}/auth/details`, {
				withCredentials: true,
			});
			// const response = await fetch(
			// 	`${import.meta.env.VITE_API_BASE_URL}/auth/details`,
			// 	{
			// 		method: 'GET',
			// 		credentials: 'include',
			// 		headers: {
			// 			'Content-Type': 'application/json',
			// 			Authorization: `Bearer ${token}`,
			// 		},
			// 	}
			// );
			// const data = await response.json();

			// if (!response.ok) {
			// 	throw new Error(data.message || 'Failed to fetch user details.');
			// }
			return response;
		} catch (error) {
			throw error;
		}
	},

	updateUserDetails: async (formData, token) => {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL}/auth/details`,
				{
					method: 'PUT',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(formData),
				}
			);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to update details.');
			}
			return data;
		} catch (error) {
			throw error;
		}
	},

	createAccountUser: async (
		firstName,
		lastName,
		email,
		password,
		city,
		country
	) => {
		const userData = {
			firstName,
			lastName,
			email,
			password,
			city,
			country,
		};

		try {
			// Execute the POST request using axios
			const response = axios.post(`${API_BASE_URL}/auth/register`, userData, {
				withCredentials: true,
			});

			// Return the response data or any other relevant information from the response
			return response;
		} catch (error) {
			// Handle any errors that occur during the API request
			console.error(
				'Error creating user account:',
				error.response ? error.response.data : error.message
			);

			return error;
		}
	},

	createAccountRescue: async (
		firstName,
		lastName,
		email,
		password,
		rescueType,
		rescueName,
		// addressLine1,
		// addressLine2,
		city,
		// county,
		// postcode,
		country
	) => {
		// Construct the data object to be sent in the POST request body
		const postData = {
			firstName,
			lastName,
			email,
			password,
			rescueType,
			rescueName,
			// addressLine1,
			// addressLine2,
			city,
			// county,
			// postcode,
			country,
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
