import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Adjust the path as necessary

const EmailVerification = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { verifyEmail } = useAuth(); // Destructure the verifyEmail function from useAuth

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const token = params.get('token');

		if (!token) {
			navigate('/'); // Redirect to home if no token is present
			return;
		}

		const verify = async () => {
			const result = await verifyEmail(token);
			if (result.success) {
				navigate('/login', { state: { emailVerified: true } });
			} else {
				navigate('/login', { state: { emailVerified: false } });
			}
		};

		verify();
	}, [location, navigate, verifyEmail]); // Include verifyEmail in the dependency array

	return <div>Verifying your email...</div>;
};

export default EmailVerification;
