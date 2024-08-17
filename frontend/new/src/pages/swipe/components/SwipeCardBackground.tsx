import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { Pet } from '@adoptdontshop/libs/pets';

type SwipeCardProps = {
	card: Pet;
	onSwipe: (pet_id: string, direction: 'left' | 'right') => void;
};

const Card = styled.div<{
	swipeDirection: 'left' | 'right' | null;
	imageUrl: string;
}>`
	position: relative;
	width: 90%;
	max-width: 300px;
	height: 450px;
	background-image: url(${({ imageUrl }) => imageUrl});
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	border-radius: 10px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	color: white;
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
		height: 400px;
		padding: 15px;
		font-size: 14px;
	}

	@media (max-width: 480px) {
		height: 350px;
		padding: 10px;
		font-size: 12px;
	}
`;

const CardContent = styled.div`
	text-align: center;
	padding: 10px 0;
	flex-grow: 1;
	background: rgba(0, 0, 0, 0.5); /* Dark overlay for better text visibility */
	width: 100%;
	border-radius: 10px;
	display: flex;
	flex-direction: column;
	justify-content: center;
`;

const CardTitle = styled.h2`
	margin: 0;
	font-size: 24px;
	@media (max-width: 768px) {
		font-size: 20px;
	}
	@media (max-width: 480px) {
		font-size: 18px;
	}
`;

const CardText = styled.p`
	margin: 5px 0;
	font-size: 16px;

	@media (max-width: 768px) {
		font-size: 14px;
	}

	@media (max-width: 480px) {
		font-size: 12px;
	}
`;

const CardActions = styled.div`
	display: flex;
	justify-content: space-around;
	width: 100%;
	padding-top: 10px;
`;

const ActionButton = styled.button`
	padding: 10px 20px;
	border: none;
	border-radius: 5px;
	background-color: rgba(255, 255, 255, 0.8);
	cursor: pointer;
	transition: background-color 0.2s ease;

	&:hover {
		background-color: rgba(255, 255, 255, 1);
	}

	@media (max-width: 768px) {
		padding: 8px 15px;
	}

	@media (max-width: 480px) {
		padding: 5px 10px;
		font-size: 12px;
	}
`;

const SwipeCardBackground: React.FC<SwipeCardProps> = ({ card, onSwipe }) => {
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
		<Card swipeDirection={swipeDirection} imageUrl='https://picsum.photos/1000'>
			<CardContent>
				<CardTitle>{card.name}</CardTitle>
				<CardText>{card.breed}</CardText>
				<CardText>Age: {card.age} years</CardText>
				<CardText>{card.short_description}</CardText>
			</CardContent>
			<CardActions>
				<ActionButton onClick={() => handleSwipe('left')}>Dislike</ActionButton>
				<ActionButton onClick={() => handleSwipe('right')}>Like</ActionButton>
				<ActionButton onClick={() => handleSwipe('right')}>Love</ActionButton>
			</CardActions>
		</Card>
	);
};

export default SwipeCardBackground;
