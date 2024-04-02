// useLoginRedirect.js
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const useLoginRedirect = () => {
	const navigate = useNavigate();
	const { isLoggedIn } = useAuth();

	useEffect(() => {
		if (!isLoggedIn) {
			navigate('/login'); // Redirect non-logged-in users to home
		}
	}, [isLoggedIn, navigate]);
};