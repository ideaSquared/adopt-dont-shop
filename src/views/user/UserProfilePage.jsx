import React, { useEffect, useState } from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import AccountProfileForm from '../../components/forms/AccountProfileForm';
import PreferencesManager from './PreferencesManager';
import ProfileCard from './ProfileCard';

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
		<>
			<Container className='mt-2' fluid>
				<ProfileCard
					userData={initialData}
					updateUserDetails={updateUserDetails}
				/>

				<Card className='bg-light mt-2 my-4'>
					<Card.Body>
						<PreferencesManager />
					</Card.Body>
				</Card>
			</Container>
		</>
	);
};

export default UserProfilePage;
