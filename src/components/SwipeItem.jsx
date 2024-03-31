import React from 'react';
import Swipeable from './Swipeable';
import { Card, Badge, Button, Carousel } from 'react-bootstrap';

const SwipeItem = ({ item, onSwipe }) => {
	// Fallback image URL
	const fallbackImage =
		'https://dummyimage.com/600x400/000/fff&text=I%27m+sure+they%27re+pretty!';

	// Function to render Carousel items
	const renderCarouselItems = () => {
		// Check if there are images
		if (item.images && item.images.length > 0) {
			return item.images.map((image, index) => (
				<Carousel.Item key={index}>
					<img
						className='d-block w-100'
						src={image}
						alt={`Slide ${index + 1}`}
					/>
				</Carousel.Item>
			));
		} else {
			// Return fallback image if no images are available
			return (
				<Carousel.Item>
					<img
						className='d-block w-100'
						src={fallbackImage}
						alt='Fallback Image'
					/>
				</Carousel.Item>
			);
		}
	};

	return (
		<Swipeable onSwipe={onSwipe}>
			<Card style={{ width: '18rem', margin: '10px' }}>
				<Carousel>{renderCarouselItems()}</Carousel>
				<Card.Body>
					<Card.Title>
						{item.petName} <Badge bg='primary'>{item.type}</Badge>
					</Card.Title>
					<Card.Text>{item.shortDescription}</Card.Text>
					<div className='mb-2'>
						<Badge bg='secondary'>Age: {item.age}</Badge>{' '}
						<Badge bg='info'>{item.gender}</Badge>
					</div>
					<div className='mb-2'>
						<Badge bg={item.status === 'Adopted' ? 'success' : 'warning'}>
							{item.status}
						</Badge>{' '}
					</div>
					<Button variant='outline-primary' style={{ marginRight: '10px' }}>
						Learn More
					</Button>
				</Card.Body>
			</Card>
		</Swipeable>
	);
};

export default SwipeItem;
