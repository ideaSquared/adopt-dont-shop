import React, { useState, useEffect } from 'react';
import { Button, Card } from 'react-bootstrap';
import SwipeItem from './SwipeItem';
import axios from 'axios';

const SwipeContainer = ({ ratingSource, onModel }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [pets, setPets] = useState([]);
	const [isLoading, setIsLoading] = useState(true); // Assume loading initially
	const [error, setError] = useState(null);
	const userId = localStorage.getItem('userId');
	const [noUnratedPets, setnoUnratedPets] = useState(false);

	useEffect(() => {
		const fetchUnratedPets = async () => {
			setIsLoading(true); // Ensure loading state is set at the beginning
			try {
				// Update the URL to match the new route for unrated pets
				const response = await axios.get(
					`${import.meta.env.VITE_API_BASE_URL}/ratings/find-unrated`, // Updated route
					{
						withCredentials: true,
					}
				);
				setPets(response.data); // Adjust according to your actual API response structure
			} catch (error) {
				if (error.response && error.response.status === 404) {
					// Specifically handle the 404 status, indicating no unrated pets were found
					setnoUnratedPets(true);
				} else {
					// Handle other errors
					setError(error.message || 'An unexpected error occurred');
				}
			} finally {
				setIsLoading(false); // Ensure to reset loading state irrespective of outcome
			}
		};

		fetchUnratedPets();
	}, []); // Dependency array is empty, meaning this effect runs once on component mount

	const postRating = async (targetId, ratingType) => {
		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/ratings`,
				{
					userId: userId,
					targetType: 'Pet', // This might remain constant or change based on your app's logic
					targetId: targetId,
					ratingType: ratingType, // "Like", "Love", or "Dislike"
					ratingSource: ratingSource, // Use the prop
					onModel: onModel, // Use the prop
				},
				{
					withCredentials: true,
				}
			);
			// console.log('Rating posted successfully', response.data);
			// Handle success scenario
		} catch (error) {
			console.error('Failed to post rating', error.message);
			// Handle error scenario
		}
	};

	const handleSwipe = (direction) => {
		if (currentIndex >= pets.length - 1) {
			setnoUnratedPets(true);
			return; // Exit the function to prevent further actions
		}

		console.log(`Swiped ${direction} on ${pets[currentIndex]._id}`);
		const ratingType = direction === 'left' ? 'dislike' : 'like';
		postRating(pets[currentIndex]._id, ratingType);
		setCurrentIndex((prevIndex) => prevIndex + 1);
	};

	const handleButtonClick = (action) => {
		if (currentIndex >= pets.length) {
			setnoUnratedPets(true);
			return; // Exit the function to prevent further actions
		}

		console.log(`${action} on ${pets[currentIndex]._id}`);
		postRating(pets[currentIndex]._id, action);
		setCurrentIndex((prevIndex) => prevIndex + 1);
	};

	if (isLoading) {
		return (
			<Card>
				<Card.Body>Loading...</Card.Body>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<Card.Body>Error: {error}</Card.Body>
			</Card>
		);
	}

	if (noUnratedPets) {
		return (
			<Card>
				<Card.Body>
					Sorry! There are no more pets for you to rate at this moment.
				</Card.Body>
			</Card>
		);
	}

	return (
		<Card>
			<Card.Body>
				{pets.length > 0 && currentIndex < pets.length ? (
					<SwipeItem item={pets[currentIndex]} onSwipe={handleSwipe} />
				) : (
					<Card.Text>No more items to swipe!</Card.Text>
				)}
			</Card.Body>
			<Card.Footer className='d-flex justify-content-around align-items-center'>
				<Button
					variant='danger'
					onClick={() => handleButtonClick('dislike')}
					className='rounded-circle mx-1'
					style={{ width: '100px', height: '100px', padding: '0' }}
					disabled={currentIndex >= pets.length} // Disable button
				>
					Dislike
				</Button>
				<Button
					variant='info'
					onClick={() => handleButtonClick('love')}
					className='rounded-circle mx-1'
					style={{ width: '100px', height: '100px', padding: '0' }}
					disabled={currentIndex >= pets.length} // Disable button
				>
					Love
				</Button>
				<Button
					variant='success'
					onClick={() => handleButtonClick('like')}
					className='rounded-circle mx-1'
					style={{ width: '100px', height: '100px', padding: '0' }}
					disabled={currentIndex >= pets.length} // Disable button
				>
					Like
				</Button>
			</Card.Footer>
		</Card>
	);
};

export default SwipeContainer;
