import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import AccountProfileForm from '../../components/forms/AccountProfileForm';
import PreferencesManager from './PreferencesManager';
import ProfileCard from './ProfileCard';

const UserProfilePage: React.FC = () => {
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
		<div className='container mx-auto mt-4'>
			<ProfileCard
				userData={initialData}
				updateUserDetails={updateUserDetails}
			/>

			<div className='bg-white shadow-md rounded-lg mt-4 p-6'>
				<PreferencesManager />
			</div>
		</div>
	);
};

export default UserProfilePage;
