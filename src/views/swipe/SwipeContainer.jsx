import React, { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import useFetchUnratedPets from '../../hooks/useFetchUnratedPets'; // Adjust the path as necessary
import { useAuth } from '../../contexts/AuthContext'; // Adjust the path as necessary
import { postRating } from '../../services/RatingService'; // Adjust the path as necessary
import SwipeLanding from './SwipeLanding';

const SwipeContainer = () => {
	const [viewState, setViewState] = useState('landing'); // Now handles multiple views: 'landing', 'carousel', 'hingeBumble'
	const [currentIndex, setCurrentIndex] = useState(0);
	const { pets, isLoading, error } = useFetchUnratedPets();
	const { userId } = useAuth().authState;

	const handleSwipe = async (direction) => {
		if (currentIndex >= pets.length) return;
		const ratingType = direction === 'left' ? 'dislike' : 'like';
		await postRating(pets[currentIndex]._id, ratingType, userId);
		setCurrentIndex((prevIndex) => prevIndex + 1);
	};

	const toggleView = () => {
		setViewState((current) => {
			switch (current) {
				case 'landing':
					return 'carousel';
				case 'carousel':
					return 'hingeBumble';
				case 'hingeBumble':
					return 'landing';
				default:
					return 'landing';
			}
		});
	};

	// Loading state
	if (isLoading)
		return (
			<Card>
				<Card.Body>Loading...</Card.Body>
			</Card>
		);

	// Error state
	if (error)
		return (
			<Card>
				<Card.Body>Error: {error}</Card.Body>
			</Card>
		);

	// Empty list state
	if (pets.length === 0)
		return (
			<Card>
				<Card.Body>No more items to swipe!</Card.Body>
			</Card>
		);

	return <SwipeLanding item={pets[currentIndex]} />;
};

export default SwipeContainer;
