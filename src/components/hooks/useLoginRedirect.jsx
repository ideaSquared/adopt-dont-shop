// useLoginRedirect.js
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const useLoginRedirect = () => {
	const navigate = useNavigate();
	const { isLoggedIn } = useAuth();

	useEffect(() => {
		if (!isLoggedIn) {
			navigate('/'); // Redirect non-logged-in users to home
		}
	}, [isLoggedIn, navigate]);
};
