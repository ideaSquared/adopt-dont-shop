// useAdminRedirect.js
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const useAdminRedirect = () => {
	const navigate = useNavigate();
	const { isAdmin, isLoggedIn } = useAuth();

	useEffect(() => {
		if (!isAdmin) {
			navigate('/'); // Redirect non-admin users to home
		}
	}, [isAdmin, navigate]);

	useEffect(() => {
		if (!isLoggedIn) {
			navigate('/'); // Redirect non-logged-in users to home
		}
	}, [isLoggedIn, navigate]);
};
