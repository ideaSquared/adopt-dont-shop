import React, { useState, useEffect } from 'react';
import { Button, Card } from 'react-bootstrap';
import SwipeItem from './SwipeItem';
import axios from 'axios';

const SwipeContainer = () => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [pets, setPets] = useState([]);
	const [isLoading, setIsLoading] = useState(true); // Assume loading initially
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchPets = async () => {
			setIsLoading(true); // Ensure loading state is set at the beginning
			try {
				// Axios automatically handles the response to JSON
				const response = await axios.get(
					`${import.meta.env.VITE_API_BASE_URL}/pets/`,
					{
						withCredentials: true,
					}
				);
				// No need to call .json() as Axios does that automatically
				setPets(response.data.data); // Adjust according to your API response structure
			} catch (error) {
				// Use error.message for a more user-friendly error message
				setError(error.message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchPets();
	}, []); // Dependency array is empty, meaning this effect runs once on component mount

	const handleSwipe = (direction) => {
		console.log(`Swiped ${direction} on ${pets[currentIndex]._id}`);
		if (currentIndex < pets.length - 1) {
			setCurrentIndex((prevIndex) => prevIndex + 1);
		}
	};

	const handleButtonClick = (action) => {
		console.log(`${action} on ${pets[currentIndex]._id}`);
		if (currentIndex < pets.length - 1) {
			setCurrentIndex((prevIndex) => prevIndex + 1);
		}
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
					onClick={() => handleButtonClick('Dislike')}
					className='rounded-circle mx-1'
					style={{ width: '100px', height: '100px', padding: '0' }}
				>
					Dislike
				</Button>
				<Button
					variant='info'
					onClick={() => handleButtonClick('Love')}
					className='rounded-circle mx-1'
					style={{ width: '100px', height: '100px', padding: '0' }}
				>
					Love
				</Button>
				<Button
					variant='success'
					onClick={() => handleButtonClick('Like')}
					className='rounded-circle mx-1'
					style={{ width: '100px', height: '100px', padding: '0' }}
				>
					Like
				</Button>
			</Card.Footer>
		</Card>
	);
};

export default SwipeContainer;
