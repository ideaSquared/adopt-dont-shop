import React from 'react';
import styled from 'styled-components';
import { Pet } from '@adoptdontshop/libs/pets';

type SwipeCardProps = {
	card: Pet;
	onSwipe: (pet_id: string, direction: 'left' | 'right') => void;
};

const Card = styled.div`
	/* Minimalistic styling */
	border: 1px solid #ddd;
	background-color: #fff;
	padding: 10px;
`;

const SwipeCardMinimal: React.FC<SwipeCardProps> = ({ card, onSwipe }) => {
	return (
		<Card>
			<h2>{card.name}</h2>
			<p>{card.breed}</p>
			<p>{card.short_description}</p>
		</Card>
	);
};

export default SwipeCardMinimal;
