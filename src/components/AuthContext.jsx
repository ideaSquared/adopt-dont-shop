// AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false); // Added isAdmin state

	useEffect(() => {
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

		checkLoginStatus();
	}, []);

	const login = async (email, password) => {
		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/auth/login`,
				{ email, password },
				{ withCredentials: true }
			);
			setIsLoggedIn(true);
			setIsAdmin(response.data.isAdmin); // Directly update isAdmin based on the response
		} catch (error) {
			console.error('Login failed:', error);
			setIsLoggedIn(false);
			setIsAdmin(false); // Ensure consistency in state
			throw error;
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
		login,
		logout,
	};

	return (
		<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
