import React, { useState } from 'react';
import { Card } from 'react-bootstrap';
import SwipeItem from './SwipeItem';
import useFetchUnratedPets from '../../hooks/useFetchUnratedPets';
import { useAuth } from '../../contexts/AuthContext';
import { postRating } from '../../services/RatingService';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';

const SwipeContainer = ({ ratingSource, onModel }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const { pets, isLoading, error, noUnratedPets } = useFetchUnratedPets();
	const { userId } = useAuth().authState;

	useLoginRedirect();

	const handleSwipe = async (direction) => {
		if (currentIndex >= pets.length) return;
		const ratingType = direction === 'left' ? 'dislike' : 'like';
		await postRating(
			pets[currentIndex]._id,
			ratingType,
			ratingSource,
			onModel,
			userId
		);
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
	if (noUnratedPets)
		return (
			<Card>
				<Card.Body>
					Sorry! There are no more pets for you to rate at this moment.
				</Card.Body>
			</Card>
		);

	return (
		<div>
			{currentIndex < pets.length ? (
				<SwipeItem item={pets[currentIndex]} onSwipe={handleSwipe} />
			) : (
				<Card>
					<Card.Body>No more items to swipe!</Card.Body>
				</Card>
			)}
		</div>
	);
};

export default SwipeContainer;
