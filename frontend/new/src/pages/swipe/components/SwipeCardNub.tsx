import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { Pet } from '@adoptdontshop/libs/pets';

type SwipeCardProps = {
	card: Pet;
	onSwipe: (pet_id: string, direction: 'left' | 'right') => void;
};

const Card = styled.div<{ swipeDirection: 'left' | 'right' | null }>`
	position: relative;
	width: 90%; /* Responsive width */
	max-width: 300px;
	height: 450px;
	background-color: white;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	border-radius: 10px;
	display: flex;
	flex-direction: column;
	justify-content: flex-end; /* Changed to align the info and actions at the bottom */
	align-items: center;
	font-size: 16px;
	padding: 20px;
	transition: transform 0.3s ease, opacity 0.3s ease;
	overflow: hidden;

	${({ swipeDirection }) =>
		swipeDirection === 'left' &&
		css`
			transform: translateX(-100%) rotate(-10deg);
			opacity: 0;
		`}

	${({ swipeDirection }) =>
		swipeDirection === 'right' &&
		css`
			transform: translateX(100%) rotate(10deg);
			opacity: 0;
		`}

	@media (max-width: 768px) {
		height: 400px; /* Adjust height for smaller screens */
		padding: 15px;
		font-size: 14px;
	}

	@media (max-width: 480px) {
		height: 350px; /* Adjust height for very small screens */
		padding: 10px;
		font-size: 12px;
	}
`;

const CardImage = styled.img`
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 180px;
	object-fit: cover;
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;

	@media (max-width: 768px) {
		height: 150px; /* Adjust image height for smaller screens */
	}

	@media (max-width: 480px) {
		height: 120px; /* Adjust image height for very small screens */
	}
`;

const CardInfo = styled.div`
	text-align: center;
	padding: 10px 0;
	flex-grow: 1;
	margin-top: 180px; /* Push down the content below the image */

	@media (max-width: 768px) {
		margin-top: 150px; /* Adjust for smaller screens */
		padding: 8px 0; /* Adjust padding for smaller screens */
	}

	@media (max-width: 480px) {
		margin-top: 120px; /* Adjust for very small screens */
		padding: 5px 0; /* Adjust padding for very small screens */
	}
`;

const CardActions = styled.div`
	display: flex;
	justify-content: space-around;
	width: 100%;
	padding-top: 10px;

	@media (max-width: 768px) {
		padding-top: 8px; /* Adjust padding for smaller screens */
	}

	@media (max-width: 480px) {
		padding-top: 5px; /* Adjust padding for very small screens */
	}
`;

const ActionButton = styled.button`
	padding: 10px 20px;
	border: none;
	border-radius: 5px;
	background-color: #eee;
	cursor: pointer;
	transition: background-color 0.2s ease;

	&:hover {
		background-color: #ddd;
	}

	@media (max-width: 768px) {
		padding: 8px 15px; /* Adjust padding for smaller screens */
	}

	@media (max-width: 480px) {
		padding: 5px 10px; /* Adjust padding for very small screens */
		font-size: 12px; /* Adjust font size for very small screens */
	}
`;

const SwipeCardNub: React.FC<SwipeCardProps> = ({ card, onSwipe }) => {
	const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(
		null
	);

	const handleSwipe = (direction: 'left' | 'right') => {
		setSwipeDirection(direction);
		setTimeout(() => {
			onSwipe(card.pet_id, direction);
			setSwipeDirection(null); // Reset the swipe direction for future swipes
		}, 300);
	};

	return (
		<Card swipeDirection={swipeDirection}>
			<CardImage src='https://picsum.photos/400' alt={card.name} />
			<CardInfo>
				<h2>{card.name}</h2>
				<p>{card.breed}</p>
				<p>Age: {card.age} years</p>
				<p>{card.short_description}</p>
			</CardInfo>
			<CardActions>
				<ActionButton onClick={() => handleSwipe('left')}>Dislike</ActionButton>
				<ActionButton onClick={() => handleSwipe('right')}>Like</ActionButton>
				<ActionButton onClick={() => handleSwipe('right')}>Love</ActionButton>
			</CardActions>
		</Card>
	);
};

export default SwipeCardNub;
