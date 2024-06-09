import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import AccountProfileForm from '../../components/forms/AccountProfileForm';
import PreferencesManager from './PreferencesManager';
import ProfileCard from './ProfileCard';
import PetCard from '../../components/cards/PetCard'; // Ensure correct path
import { useFetchRatedPets } from '../../hooks/useFetchRatedPets';
import Slider from 'react-slick';

const UserProfilePage: React.FC = () => {
	const [initialData, setInitialData] = useState({});
	const { fetchUserDetails, updateUserDetails } = useAuth();
	const { ratedPets, isLoading, error } = useFetchRatedPets();

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

	const settings = {
		dots: true,
		infinite: true,
		speed: 500,
		slidesToShow: 3,
		slidesToScroll: 1,
	};

	return (
		<div className='container mx-auto mt-4'>
			<ProfileCard
				userData={initialData}
				updateUserDetails={updateUserDetails}
			/>

			<div className='bg-white shadow-md rounded-lg mt-4 p-6'>
				<h2 className='text-2xl font-bold mb-4'>Rated Pets</h2>
				{isLoading && <p>Loading...</p>}
				{error && <p>{error.message}</p>}
				{!isLoading && ratedPets.length > 0 && (
					<Slider {...settings}>
						{ratedPets.map((pet) => (
							<PetCard
								key={pet.pet_id}
								pet={pet}
								onEditPet={() => {}}
								onDeletePet={() => {}}
								canEditPet={false}
								canDeletePet={false}
								onApplicationClick={() => {}}
								isRescue={false}
							/>
						))}
					</Slider>
				)}
				{!isLoading && ratedPets.length === 0 && <p>No rated pets found.</p>}
			</div>

			<div className='bg-white shadow-md rounded-lg mt-4 p-6'>
				<PreferencesManager />
			</div>
		</div>
	);
};

export default UserProfilePage;
