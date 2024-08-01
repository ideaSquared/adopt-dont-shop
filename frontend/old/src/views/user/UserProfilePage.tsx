import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import AccountProfileForm from '../../components/forms/AccountProfileForm';
import PreferencesManager from './PreferencesManager';
import ProfileCard from './ProfileCard';
import PetCard from '../../components/cards/PetCard'; // Ensure correct path
import { useFetchRatedPets } from '../../hooks/useFetchRatedPets';
import useApplications from '../../hooks/useApplications';
import Slider from 'react-slick';

const UserProfilePage: React.FC = () => {
	const [initialData, setInitialData] = useState({});
	const { fetchUserDetails, updateUserDetails } = useAuth();
	const [userId, setUserId] = useState<string | undefined>(undefined);
	const {
		ratedPets,
		isLoading: isLoadingRatedPets,
		error: errorRatedPets,
	} = useFetchRatedPets();

	useLoginRedirect();

	useEffect(() => {
		const initFetch = async () => {
			const userDetails = await fetchUserDetails();
			if (userDetails) {
				setInitialData({
					user_id: userDetails.userId,
					email: userDetails.email,
					firstName: userDetails.firstName,
					lastName: userDetails.lastName,
					city: userDetails.city,
					country: userDetails.country,
				});
				setUserId(userDetails.userId);
			}
		};

		initFetch();
	}, [fetchUserDetails]);

	// Only call useApplications when userId is available
	const {
		applications,
		loading: isLoadingApplications,
		error: errorApplications,
	} = useApplications(false, undefined, userId);

	const petSliderSettings = {
		dots: true,
		infinite: ratedPets.length > 1,
		speed: 500,
		slidesToShow: 4,
		slidesToScroll: 1,
	};

	const applicationSliderSettings = {
		dots: true,
		infinite: applications.length > 1,
		speed: 500,
		slidesToShow: 4,
		slidesToScroll: 1,
	};

	const canApplyNow = true; // This would typically come from props or some state logic

	return (
		<div className='container mx-auto mt-4'>
			<ProfileCard
				userData={initialData}
				updateUserDetails={updateUserDetails}
			/>

			<div className='bg-white shadow-md rounded-lg mt-4 p-6'>
				<h3 className='text-xl font-bold mb-4'>Your Applications</h3>
				{isLoadingApplications && (
					<div className='flex items-center justify-center'>
						<div
							className='spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full'
							role='status'
						>
							<span className='visually-hidden'>Loading...</span>
						</div>
					</div>
				)}
				{errorApplications && (
					<p className='text-red-500'>{errorApplications}</p>
				)}
				{!isLoadingApplications && applications.length > 0 && (
					<Slider {...applicationSliderSettings}>
						{applications.map((application) => (
							<div
								key={application.application_id}
								className='p-4 mb-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300'
							>
								<p className='text-lg font-semibold'>
									<strong>Status:</strong> {application.status}
								</p>
								<p className='text-gray-700'>
									<strong>Pet Name:</strong> {application.pet_name}
								</p>
							</div>
						))}
					</Slider>
				)}
				{!isLoadingApplications && applications.length === 0 && (
					<p className='text-gray-700'>No applications found.</p>
				)}
			</div>

			<div className='bg-white shadow-md rounded-lg mt-4 p-6'>
				<h3 className='text-xl font-bold mb-4'>Pets you've liked (or loved)</h3>
				{isLoadingRatedPets && <p>Loading...</p>}
				{errorRatedPets && errorRatedPets.status === 404 && (
					<p>No pets rated yet.</p>
				)}
				{errorRatedPets && errorRatedPets.status !== 404 && (
					<p>{errorRatedPets.message}</p>
				)}
				{!isLoadingRatedPets && ratedPets.length > 0 && (
					<Slider {...petSliderSettings}>
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
				{!isLoadingRatedPets && ratedPets.length === 0 && !errorRatedPets && (
					<p>No rated pets found.</p>
				)}
			</div>

			<div className='bg-white shadow-md rounded-lg mt-4 p-6'>
				<PreferencesManager />
			</div>
		</div>
	);
};

export default UserProfilePage;
