import React, { useState } from 'react';
import { Card } from 'react-bootstrap';
import useFetchUnratedPets from '../../hooks/useFetchUnratedPets';
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

	// Loading state
	if (isLoading) {
		return (
			<Card>
				<Card.Body>Loading...</Card.Body>
			</Card>
		);
	}

	// Error state
	if (error) {
		return (
			<Card>
				<Card.Body>Error: {error}</Card.Body>
			</Card>
		);
	}

	// Check if all pets have been swiped
	if (currentIndex >= pets.length) {
		return (
			<Card>
				<Card.Body>No more items to swipe!</Card.Body>
			</Card>
		);
	}

	// Otherwise, render SwipeLanding with the current pet
	const currentPet = pets[currentIndex];
	return <SwipeLanding item={currentPet} handleSwipe={handleSwipe} />;
};

export default SwipeContainer;
