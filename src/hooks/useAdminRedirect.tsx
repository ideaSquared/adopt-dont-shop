import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const useAdminRedirect = () => {
	const navigate = useNavigate();
	const { authState } = useAuth();

	useEffect(() => {
		if (!authState.isAdmin || !authState.isLoggedIn) {
			navigate('/'); // Redirect non-admin or non-logged-in users to home
		}
	}, [authState.isAdmin, authState.isLoggedIn, navigate]);
};
