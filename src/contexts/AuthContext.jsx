import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/AuthService'; // Ensure this path matches the actual location

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const auth = useProvideAuth();
	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

const useProvideAuth = () => {
	const [authState, setAuthState] = useState({
		userId: '',
		isLoggedIn: false,
		isAdmin: false,
		isRescue: false,
		userPermissions: [],
	});

	useEffect(() => {
		const verifyAuth = async () => {
			try {
				const response = await AuthService.checkLoginStatus(); // Adjust based on your actual service call
				if (response.status === 200) {
					// Update auth state based on response
					setAuthState({
						isLoggedIn: true,
						userId: response.data.userId,
						isAdmin: response.data.isAdmin,
						// Add any other state you need
					});
					checkRescueRoute();
				}
			} catch (error) {
				console.error('Could not verify auth:', error);
				// Handle error, potentially resetting the auth state
				setAuthState({
					isLoggedIn: false,
					userId: '',
					isAdmin: false,
					// Reset other state as needed
				});
			}
		};

		verifyAuth();
	}, []);

	// const checkLoginStatus = async () => {
	// 	try {
	// 		console.log(authState);
	// 		const response = await AuthService.checkLoginStatus();
	// 		setAuthState((prevState) => ({
	// 			...prevState,
	// 			isLoggedIn: response.data.isLoggedIn,
	// 			isAdmin: response.data.isAdmin || false,
	// 			userId: response.data.userId,
	// 		}));
	// 		if (response.data.isLoggedIn) {
	// 			await Promise.all([fetchPermissions(), checkRescueRoute()]);
	// 		}
	// 	} catch (error) {
	// 		console.error('Error checking login status:', error);
	// 		setAuthState((prevState) => ({
	// 			...prevState,
	// 			isLoggedIn: false,
	// 			isAdmin: false,
	// 			userId: '',
	// 			userPermissions: [],
	// 		}));
	// 	}
	// };

	const fetchPermissions = async () => {
		try {
			const response = await AuthService.fetchPermissions();
			console.log(response.data.permissions);
			setAuthState((prevState) => ({
				...prevState,
				userPermissions: response.data.permissions || [],
			}));
		} catch (error) {
			console.error('Error fetching user permissions:', error);
			setAuthState((prevState) => ({
				...prevState,
				userPermissions: [],
			}));
		}
	};

	const checkRescueRoute = async () => {
		try {
			const response = await AuthService.checkRescueRoute();
			setAuthState((prevState) => ({
				...prevState,
				isRescue: response.status === 200,
			}));
			fetchPermissions();
		} catch (error) {
			console.error('Error checking rescue route:', error);
			setAuthState((prevState) => ({
				...prevState,
				isRescue: false,
			}));
		}
	};

	const login = async (email, password) => {
		try {
			const response = await AuthService.login(email, password);

			// console.log('RESPONSE: ', response);

			if (response.status === 200) {
				setAuthState((prevState) => {
					const newState = {
						...prevState,
						isLoggedIn: true,
						isAdmin: response.data.isAdmin,
						userId: response.data.userId,
					};

					return newState;
				});
				checkRescueRoute();
			} else {
				return false;
			}
		} catch (error) {
			console.error('Login attempt failed:', error);
			setAuthState((prevState) => ({
				...prevState,
				isLoggedIn: false,
				isAdmin: false,
			}));
			throw new Error(
				error.response?.data.message || 'An error occurred during login.'
			);
		}
	};

	const logout = async () => {
		try {
			await AuthService.logout();
			setAuthState({
				isLoggedIn: false,
				isAdmin: false,
				userPermissions: [],
				isRescue: false,
			});
		} catch (error) {
			console.error('Logout failed:', error);
		}
	};

	const verifyEmail = async (token) => {
		try {
			await AuthService.verifyEmail(token);
			return { success: true, message: 'Email verified successfully.' };
		} catch (error) {
			return { success: false, message: 'Email verification failed.' };
		}
	};

	const resetPassword = async (token, newPassword) => {
		try {
			const response = await AuthService.resetPassword(token, newPassword);
			return {
				success: true,
				message: 'Password has been reset successfully.',
			};
		} catch (error) {
			console.error('Error resetting password:', error);
			return {
				success: false,
				message: error.message || 'Error resetting password.',
			};
		}
	};

	const sendForgotPasswordEmail = async (email) => {
		try {
			await AuthService.sendForgotPasswordEmail(email);
			return {
				success: true,
				message: 'Successfully sent password reset email.',
			};
		} catch (error) {
			console.error('Error sending forgot password email:', error);
			return {
				success: false,
				message: error.message || 'Error sending password reset email.',
			};
		}
	};

	const createUser = async (
		firstName,
		lastName,
		email,
		password,
		city,
		country
	) => {
		try {
			const response = await AuthService.createAccountUser(
				firstName,
				lastName,
				email,
				password,
				city,
				country
			);

			return {
				success: true,
				message: 'Registration successful!',
				data: response.data,
			};
		} catch (error) {
			console.error('Registration error:', error);
			return {
				success: false,
				message: error.message || 'An unexpected error occurred',
			};
		}
	};

	const createRescue = async (
		firstName,
		lastName,
		email,
		password,
		rescueType,
		rescueName,
		city,
		country
	) => {
		try {
			const response = await AuthService.createAccountRescue(
				firstName,
				lastName,
				email,
				password,
				rescueType,
				rescueName,
				city,
				country
			);
			return { success: true, message: 'Rescue created successfully.' };
		} catch (error) {
			console.error('Error creating rescue:', error);
			return {
				success: false,
				message: error.message || 'Error creating rescue.',
			};
		}
	};

	const fetchUserDetails = async () => {
		try {
			const response = await AuthService.getUserDetails();

			return response.data;
		} catch (error) {
			console.error('Could not fetch user details:', error);
			return { message: error.message, type: 'danger' };
		}
	};

	/**
	 * Asynchronously updates user details using the AuthService.
	 * This function handles the process of sending data to the server,
	 * catching any errors, and formatting the response to a standardized
	 * object structure that indicates success or failure.
	 *
	 * @param {Object} formData - The data to be sent for updating user details.
	 * @returns {Promise<Object>} A promise that resolves to an object indicating the outcome.
	 */
	const updateUserDetails = async (formData) => {
		try {
			// Attempt to update user details through the AuthService
			await AuthService.updateUserDetails(formData);

			// Success: Return a success message with a corresponding type
			return {
				success: true,
				message: 'Details updated successfully!',
				type: 'success',
			};
		} catch (error) {
			// Log the error to the console for debugging purposes
			console.error('Failed to update user details:', error);

			// Error: Return an error message with a corresponding type
			return {
				success: false,
				message: error.message,
				type: 'danger',
			};
		}
	};

	return {
		authState,
		login,
		logout,
		verifyEmail,
		resetPassword,
		sendForgotPasswordEmail,
		createUser,
		createRescue,
		fetchUserDetails,
		updateUserDetails,
	};
};

export const useAuth = () => useContext(AuthContext);
