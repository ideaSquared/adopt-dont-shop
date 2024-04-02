import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios'; // or your preferred way of making HTTP requests

const EmailVerification = () => {
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		const verifyEmail = async () => {
			const params = new URLSearchParams(location.search);
			const token = params.get('token');

			if (!token) {
				navigate('/'); // Redirect to home if no token is present
				return;
			}

			try {
				// Adjust the URL to your backend endpoint
				await axios.get(
					`${
						import.meta.env.VITE_API_BASE_URL
					}/auth/verify-email?token=${token}`
				);
				// Handle success, perhaps set a success message or directly log the user in
				navigate('/login', { state: { emailVerified: true } });
			} catch (error) {
				// Handle error, could navigate with an error message or show it on the current page
				navigate('/login', { state: { emailVerified: false } });
			}
		};

		verifyEmail();
	}, [location, navigate]);

	// Render a loading message or spinner while the verification is in progress
	return <div>Verifying your email...</div>;
};

export default EmailVerification;
