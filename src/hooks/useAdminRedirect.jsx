// useAdminRedirect.js
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const useAdminRedirect = () => {
	const navigate = useNavigate();
	const { authState } = useAuth();

	useEffect(() => {
		if (!authState.isAdmin) {
			navigate('/'); // Redirect non-admin users to home
		}
	}, [authState.isAdmin, navigate]);

	useEffect(() => {
		if (!authState.isLoggedIn) {
			navigate('/'); // Redirect non-logged-in users to home
		}
	}, [authState.isLoggedIn, navigate]);
};
