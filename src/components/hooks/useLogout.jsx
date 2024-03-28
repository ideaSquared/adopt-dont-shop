// hooks/useLogout.js
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export const useLogout = () => {
	const navigate = useNavigate();
	const { logout } = useAuth();

	const handleLogout = async () => {
		await logout();
		navigate('/'); // Navigate to index page after logout
	};

	return handleLogout;
};
