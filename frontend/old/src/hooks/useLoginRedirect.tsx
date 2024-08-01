import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const useLoginRedirect = () => {
	const navigate = useNavigate();
	const { authState } = useAuth();

	useEffect(() => {
		if (!authState.isLoggedIn) {
			navigate('/login'); // Redirect non-logged-in users to login page
		}
	}, [authState.isLoggedIn, navigate]);
};
