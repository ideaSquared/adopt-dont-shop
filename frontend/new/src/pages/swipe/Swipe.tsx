import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import SwipeCard from './components/SwipeCard';
import { Pet, PetsService } from '@adoptdontshop/libs/pets';

const SwipeContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100vh;
	position: relative;
	overflow: hidden;
`;

const DefaultCard = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	width: 300px;
	height: 400px;
	background-color: #f8f8f8;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	border-radius: 10px;
	font-size: 24px;
	color: #555;
`;

const Swipe: React.FC = () => {
	const [petCards, setPetCards] = useState<Pet[]>([]);

	useEffect(() => {
		const fetchedPets = PetsService.getPets() as Pet[];
		setPetCards(fetchedPets);
	}, []);

	const handleSwipe = (pet_id: string, direction: 'left' | 'right') => {
		setPetCards((prevCards) =>
			prevCards.filter((petCard) => petCard.pet_id !== pet_id)
		);
	};

	const currentCard = petCards[0];

	return (
		<SwipeContainer>
			{currentCard ? (
				<SwipeCard
					key={currentCard.pet_id}
					card={currentCard}
					onSwipe={handleSwipe}
				/>
			) : (
				<DefaultCard>No more pets available</DefaultCard>
			)}
		</SwipeContainer>
	);
};

export default Swipe;
