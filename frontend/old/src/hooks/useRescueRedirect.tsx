// useLoginRedirect.js
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const useRescueRedirect = () => {
	const navigate = useNavigate();
	const { authState } = useAuth();

	useEffect(() => {
		if (!authState.isRescue) {
			navigate('/'); // Redirect non-logged-in users to home
		}
	}, [authState.isRescue, navigate]);
};
