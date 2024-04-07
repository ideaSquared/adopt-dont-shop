import React from 'react';
import { Carousel, Badge, Card, Button, Image } from 'react-bootstrap';

const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;

export const CarouselComponent = ({ images, fallbackImage }) => (
	<Carousel>
		{(images && images.length > 0 ? images : [fallbackImage]).map(
			(image, index) => (
				<Carousel.Item key={index}>
					<Image
						className='d-block w-100'
						src={fileUploadsPath + image}
						alt={`Slide ${index + 1}`}
						fluid
					/>
				</Carousel.Item>
			)
		)}
	</Carousel>
);

export const BadgeCollection = ({ item }) => (
	<div>
		<Badge bg='secondary'>Age: {item.age}</Badge>{' '}
		<Badge bg='info'>{item.gender}</Badge>
		<Badge bg={item.status === 'Adopted' ? 'success' : 'warning'}>
			{item.status}
		</Badge>
	</div>
);

export const ActionButtons = ({ onAction, currentIndex, petsLength }) => {
	// Mapping of action types to button variants for styling
	const actionToVariant = {
		dislike: 'danger',
		like: 'success',
		love: 'info',
	};

	return (
		<Card.Footer className='d-flex justify-content-around align-items-center'>
			{Object.entries(actionToVariant).map(([action, variant]) => (
				<Button
					key={action}
					variant={variant}
					onClick={() => onAction(action)}
					className='rounded-circle mx-1'
					style={{ width: '100px', height: '100px', padding: '0' }}
					disabled={currentIndex >= petsLength} // Disable buttons if there are no more pets to rate
				>
					{action.charAt(0).toUpperCase() + action.slice(1)}
				</Button>
			))}
		</Card.Footer>
	);
};
