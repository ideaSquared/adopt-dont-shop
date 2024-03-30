// useLoginRedirect.js
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const useRescueRedirect = () => {
	const navigate = useNavigate();
	const { isRescue } = useAuth();

	useEffect(() => {
		console.log('RES: ', isRescue);
		if (!isRescue) {
			navigate('/'); // Redirect non-logged-in users to home
		}
	}, [isRescue, navigate]);
};
