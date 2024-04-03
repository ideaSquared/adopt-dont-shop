import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/AuthService'; // Ensure this path matches the actual location

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const auth = useProvideAuth();
	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

const useProvideAuth = () => {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const [userPermissions, setUserPermissions] = useState([]);
	const [isRescue, setIsRescue] = useState(false);

	useEffect(() => {
		checkLoginStatus();
	}, []);

	const checkLoginStatus = async () => {
		try {
			const response = await AuthService.checkLoginStatus();
			setIsLoggedIn(response.data.isLoggedIn);
			setIsAdmin(response.data.isAdmin || false);
			localStorage.setItem('userId', response.data.userId);
			if (response.data.isLoggedIn) {
				await Promise.all([fetchPermissions(), checkRescueRoute()]);
			}
		} catch (error) {
			console.error('Error checking login status:', error);
			setIsLoggedIn(false);
			setIsAdmin(false);
			setUserPermissions([]);
		}
	};

	const fetchPermissions = async () => {
		try {
			const response = await AuthService.fetchPermissions();
			setUserPermissions(response.data.permissions || []);
		} catch (error) {
			console.error('Error fetching user permissions:', error);
			setUserPermissions([]);
		}
	};

	const checkRescueRoute = async () => {
		try {
			const response = await AuthService.checkRescueRoute();
			setIsRescue(response.status === 200);
		} catch (error) {
			console.error('Error checking rescue route:', error);
			setIsRescue(false);
		}
	};

	const login = async (email, password) => {
		try {
			const response = await AuthService.login(email, password);
			setIsLoggedIn(true);
			setIsAdmin(response.data.isAdmin);
			await Promise.all([fetchPermissions(), checkRescueRoute()]);
		} catch (error) {
			console.error('Login attempt failed:', error);
			setIsLoggedIn(false);
			setIsAdmin(false);
			throw new Error(
				error.response?.data.message || 'An error occurred during login.'
			);
		}
	};

	const logout = async () => {
		try {
			await AuthService.logout();
			setIsLoggedIn(false);
			setIsAdmin(false);
			setUserPermissions([]);
			setIsRescue(false);
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

	const registerUser = async (userData) => {
		try {
			const response = await AuthService.registerUser(userData);
			localStorage.setItem('userId', response.data.userId); // Assuming response includes userId
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

	const createRescue = async (rescueType, rescueData) => {
		try {
			const response = await AuthService.createRescue(rescueType, rescueData);
			return { success: true, message: 'Rescue created successfully.' };
		} catch (error) {
			console.error('Error creating rescue:', error);
			return {
				success: false,
				message: error.message || 'Error creating rescue.',
			};
		}
	};

	return {
		isLoggedIn,
		isAdmin,
		isRescue,
		userPermissions,
		login,
		logout,
		verifyEmail,
		resetPassword,
		sendForgotPasswordEmail,
		registerUser,
		createRescue,
	};
};

export const useAuth = () => useContext(AuthContext);
