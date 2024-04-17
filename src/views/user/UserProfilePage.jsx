import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import AccountProfileForm from '../../components/forms/AccountProfileForm';

const UserProfilePage = () => {
	const [initialData, setInitialData] = useState({});
	const { fetchUserDetails, updateUserDetails } = useAuth();

	useLoginRedirect();

	useEffect(() => {
		const initFetch = async () => {
			const userDetails = await fetchUserDetails();
			if (userDetails) {
				setInitialData({
					email: userDetails.email,
					firstName: userDetails.firstName,
					lastName: userDetails.lastName,
					city: userDetails.city,
					country: userDetails.country,
				});
			}
		};

		initFetch();
	}, []);

	return (
		<Container
			className='d-flex justify-content-center mt-3'
			style={{ minHeight: '100vh' }}
		>
			<div className='justify-content-md-center w-50'>
				<AccountProfileForm
					initialData={initialData}
					updateUserDetails={updateUserDetails}
				/>
			</div>
		</Container>
	);
};

export default UserProfilePage;
