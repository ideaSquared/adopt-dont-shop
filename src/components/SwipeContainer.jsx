import React, { useState, useEffect } from 'react';
import { Button, Card } from 'react-bootstrap';
import SwipeItem from './SwipeItem';
import useFetchUnratedPets from './hooks/useFetchUnratedPets'; // Custom hook for fetching pets
import { postRating } from './services/ratingsService'; // Service layer for API calls

const SwipeContainer = ({ ratingSource, onModel }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const { pets, isLoading, error, noUnratedPets } = useFetchUnratedPets();

	const handleSwipe = async (direction) => {
		if (currentIndex < pets.length) {
			const ratingType = direction === 'left' ? 'dislike' : 'like';
			await postRating(
				pets[currentIndex]._id,
				ratingType,
				ratingSource,
				onModel
			);
			setCurrentIndex(currentIndex + 1);
		}
	};

	const handleButtonClick = (action) =>
		handleSwipe(action === 'dislike' ? 'left' : 'right');

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
		<Card>
			<Card.Body>
				{pets.length > 0 && currentIndex < pets.length ? (
					<SwipeItem item={pets[currentIndex]} onSwipe={handleSwipe} />
				) : (
					<Card.Text>No more items to swipe!</Card.Text>
				)}
			</Card.Body>
			<ActionButtons
				currentIndex={currentIndex}
				petsLength={pets.length}
				onAction={handleButtonClick}
			/>
		</Card>
	);
};

const ActionButtons = ({ currentIndex, petsLength, onAction }) => (
	<Card.Footer className='d-flex justify-content-around align-items-center'>
		{['dislike', 'love', 'like'].map((action, index) => (
			<Button
				key={index}
				variant={
					action === 'dislike'
						? 'danger'
						: action === 'like'
						? 'success'
						: 'info'
				}
				onClick={() => onAction(action)}
				className='rounded-circle mx-1'
				style={{ width: '100px', height: '100px', padding: '0' }}
				disabled={currentIndex >= petsLength}
			>
				{action.charAt(0).toUpperCase() + action.slice(1)}
			</Button>
		))}
	</Card.Footer>
);

export default SwipeContainer;
