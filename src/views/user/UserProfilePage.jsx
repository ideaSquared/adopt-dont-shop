import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import AccountProfileForm from '../../components/forms/AccountProfileForm';
import AlertComponent from '../../components/common/AlertComponent';

const UserProfilePage = () => {
	const [initialData, setInitialData] = useState({});
	const [alert, setAlert] = useState({ message: null, type: null });
	const { fetchUserDetails, updateUserDetails } = useAuth();

	useLoginRedirect();

	useEffect(() => {
		const initFetch = async () => {
			const userDetails = await fetchUserDetails();
			if (userDetails) {
				setInitialData({
					email: userDetails.email,
					firstName: userDetails.firstName,
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
				{alert.message && (
					<AlertComponent
						type={alert.type}
						message={alert.message}
						onClose={() => setAlert({ message: null, type: null })}
					/>
				)}
				<AccountProfileForm
					initialData={initialData}
					updateUserDetails={updateUserDetails}
					setAlert={setAlert}
				/>
			</div>
		</Container>
	);
};

export default UserProfilePage;
