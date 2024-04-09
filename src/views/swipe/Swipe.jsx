import React, { useState } from 'react';
import { Container, Card, Button, Badge } from 'react-bootstrap';
import './Swipe.css'; // Make sure to update this file with new styles.

const Swipe = ({ item }) => {
	const [viewDetails, setViewDetails] = useState(false);
	const toggleViewDetails = () => setViewDetails(!viewDetails);
	const images = item.images;
	const basePath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;
	const fallbackImage = 'https://placehold.it/500';
	const imageSrc =
		images && images.length > 0
			? `${basePath}${images[0]}`
			: `${fallbackImage}`;

	return (
		<div className='d-flex align-items-center justify-content-center swipe-screen'>
			<Card
				className='swipe-card'
				style={{ backgroundImage: `url(${imageSrc})` }}
			>
				<Card.Body className='swipe-overlay d-flex flex-column'>
					<div className='d-flex justify-content-between'>
						<Card.Title>{item.petName}</Card.Title>
						<div className='badge-container d-flex align-items-start'>
							<Badge bg='secondary'>Age: {item.age}</Badge>{' '}
							<Badge bg='info'>{item.gender}</Badge>{' '}
							<Badge bg={item.status === 'Adopted' ? 'success' : 'warning'}>
								{item.status}
							</Badge>
						</div>
					</div>
					<Card.Text>{item.shortDescription}</Card.Text>
					<div className='action-buttons mt-auto'>
						<Button variant='outline-danger' className='rounded-circle dislike'>
							Dislike
						</Button>
						<Button variant='outline-primary' className='rounded-circle love'>
							Love
						</Button>
						<Button variant='outline-success' className='rounded-circle like'>
							Like
						</Button>
					</div>
				</Card.Body>
			</Card>
		</div>
	);
};

export default Swipe;
