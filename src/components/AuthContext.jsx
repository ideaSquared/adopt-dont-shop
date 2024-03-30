import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const [userPermissions, setUserPermissions] = useState([]);
	const [isRescue, setIsRescue] = useState(false);

	useEffect(() => {
		checkLoginStatus();
	}, []);

	const checkLoginStatus = async () => {
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_BASE_URL}/auth/status`,
				{ withCredentials: true }
			);
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
			const response = await axios.get(
				`${import.meta.env.VITE_API_BASE_URL}/auth/permissions`,
				{ withCredentials: true }
			);
			setUserPermissions(response.data.permissions || []);
		} catch (error) {
			console.error('Error fetching user permissions:', error);
			setUserPermissions([]);
		}
	};

	const checkRescueRoute = async () => {
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_BASE_URL}/auth/my-rescue`,
				{ withCredentials: true }
			);
			setIsRescue(response.status === 200);
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
			setIsAdmin(response.data.isAdmin);
			await Promise.all([fetchPermissions(), checkRescueRoute()]);
		} catch (error) {
			console.error('Login attempt failed:', error);
			setIsLoggedIn(false);
			setIsAdmin(false);
			// Consider updating the UI with this error
			throw new Error(
				error.response?.data.message || 'An error occurred during login.'
			);
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
			setIsAdmin(false);
			setUserPermissions([]);
			setIsRescue(false);
		} catch (error) {
			console.error('Logout failed:', error);
			// Optionally, update the UI to inform the user of the logout failure
		}
	};

	const contextValue = {
		isLoggedIn,
		isAdmin,
		isRescue,
		userPermissions,
		login,
		logout,
	};

	return (
		<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
