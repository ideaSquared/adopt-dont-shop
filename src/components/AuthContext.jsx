// AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false); // Added isAdmin state
	const [isRescue, setIsRescue] = useState(false);

	useEffect(() => {
		checkLoginStatus();
		if (checkLoginStatus()) {
			checkRescueRoute();
		}
	}, []);

	const checkLoginStatus = async () => {
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_BASE_URL}/auth/status`,
				{ withCredentials: true }
			);
			setIsLoggedIn(response.data.isLoggedIn);
			setIsAdmin(response.data.isAdmin || false);
		} catch (error) {
			// Handle 401 Unauthorized specifically
			if (error.response && error.response.status === 401) {
				console.error('User not logged in');
				setIsLoggedIn(false);
				setIsAdmin(false);
			} else {
				// Handle other errors
				console.error('Error checking login status:', error);
			}
		}
	};

	const checkRescueRoute = async () => {
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_BASE_URL}/auth/my-rescue`,
				{ withCredentials: true }
			);
			if (response.status === 200) {
				setIsRescue(true);
			} else {
				setIsRescue(false);
			}
		} catch (error) {
			console.error('Error checking rescue route:', error);
			setIsRescue(false);
		}
	};

	const login = async (email, password) => {
		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/auth/login`,
				{ email, password },
				{ withCredentials: true }
			);
			setIsLoggedIn(true);
			setIsAdmin(response.data.isAdmin); // Directly update isAdmin based on the response
			checkRescueRoute();
			localStorage.setItem('userId', response.data.userId);
		} catch (error) {
			console.error('Login attempt failed:', error);
			setIsLoggedIn(false);
			setIsAdmin(false); // Ensure consistency in state

			// Check if the error is due to an Axios response (i.e., a response that falls outside the range of 2xx)
			if (error.response) {
				// The request was made and the server responded with a status code that falls out of the range of 2xx
				const errorMessage =
					error.response.data.message ||
					'An unexpected error occurred during login.';
				throw new Error(errorMessage);
			} else if (error.request) {
				// The request was made but no response was received
				throw new Error(
					'The login request was made but no response was received'
				);
			} else {
				// Something happened in setting up the request that triggered an Error
				throw new Error('An error occurred while setting up the login request');
			}
		}
	};

	const logout = async () => {
		try {
			await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/auth/logout`,
				{},
				{ withCredentials: true }
			);
			setIsLoggedIn(false);
			setIsAdmin(false); // Reset isAdmin on logout
		} catch (error) {
			console.error('Logout failed:', error);
		}
	};

	const contextValue = {
		isLoggedIn,
		isAdmin, // Make isAdmin available in the context
		isRescue,
		login,
		logout,
	};

	return (
		<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
