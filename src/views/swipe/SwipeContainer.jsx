import React, { useState } from 'react';
import { Card } from 'react-bootstrap';
import SwipeItem from '../../../_archive/SwipeItem';
import useFetchUnratedPets from '../../hooks/useFetchUnratedPets'; // Adjust the path as necessary
import { useAuth } from '../../contexts/AuthContext'; // Adjust the path as necessary
import { postRating } from '../../services/RatingService'; // Adjust the path as necessary
import Swipe from './Swipe';

const SwipeContainer = () => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const { pets, isLoading, error } = useFetchUnratedPets();
	const { userId } = useAuth().authState;

	const handleSwipe = async (direction) => {
		if (currentIndex >= pets.length) return;
		const ratingType = direction === 'left' ? 'dislike' : 'like';
		await postRating(pets[currentIndex]._id, ratingType, userId);
		setCurrentIndex((prevIndex) => prevIndex + 1);
	};

	if (isLoading)
		return (
			<Card>
				<Card.Body>Loading...</Card.Body>
			</Card>
		);
	if (error)
		return (
			<Card>
				<Card.Body>Error: {error}</Card.Body>
			</Card>
		);
	if (pets.length === 0)
		return (
			<Card>
				<Card.Body>No more items to swipe!</Card.Body>
			</Card>
		);

	return (
		<Swipe item={pets[currentIndex]} />
		// <SwipeItem
		// 	item={pets[currentIndex]}
		// 	onSwipe={handleSwipe}
		// 	currentIndex={currentIndex}
		// 	petsLength={pets.length}
		// />
	);
};

export default SwipeContainer;
