import React, { useState } from 'react';
import { useFetchUnratedPets } from '../../hooks/useFetchUnratedPets';
import { useAuth } from '../../contexts/AuthContext';
import { postRating } from '../../services/RatingService';
import SwipeLanding from './SwipeLanding';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';

const SwipeContainer = () => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const { pets, isLoading, error } = useFetchUnratedPets();
	const { userId } = useAuth().authState;
	useLoginRedirect();

	const handleSwipe = async (direction) => {
		if (currentIndex < pets.length) {
			const ratingType =
				direction === 'love'
					? 'love'
					: direction === 'left'
					? 'dislike'
					: 'like';
			await postRating(pets[currentIndex].pet_id, ratingType, userId);

			setCurrentIndex((prevIndex) => prevIndex + 1);
		}
	};

	if (isLoading) {
		return (
			<div className='flex items-center justify-center h-screen'>
				<div className='bg-white p-6 rounded-lg shadow-md'>Loading...</div>
			</div>
		);
	}

	if (currentIndex >= pets.length || (error?.status === 404 && error)) {
		return (
			<div className='flex items-center justify-center h-screen'>
				<div className='bg-white p-6 rounded-lg shadow-md'>
					No more items to swipe!
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='flex items-center justify-center h-screen'>
				<div className='bg-white p-6 rounded-lg shadow-md'>
					Error: {error.message}
				</div>
			</div>
		);
	}

	const currentPet = pets[currentIndex];
	return <SwipeLanding item={currentPet} handleSwipe={handleSwipe} />;
};

export default SwipeContainer;
