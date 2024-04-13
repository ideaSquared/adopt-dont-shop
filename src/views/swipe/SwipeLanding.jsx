import React, { useState } from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { HandThumbsDown, HeartFill, HandThumbsUp } from 'react-bootstrap-icons';

const SwipeLanding = ({ item }) => {
	const [viewDetails, setViewDetails] = useState(false);
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const toggleViewDetails = () => setViewDetails(!viewDetails);
	const images = item.images;
	const basePath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;
	const fallbackImage = 'https://placehold.it/500';

	// Function to handle next image
	const nextImage = () => {
		setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
	};

	// Function to handle previous image
	const prevImage = () => {
		setCurrentImageIndex((prevIndex) => {
			return prevIndex - 1 < 0 ? images.length - 1 : prevIndex - 1;
		});
	};

	// Dynamically set the image source based on the current index
	const imageSrc =
		images && images.length > 0
			? `${basePath}${images[currentImageIndex]}`
			: fallbackImage;

	return (
		<div className='d-flex align-items-center justify-content-center swipe-screen'>
			{!viewDetails ? (
				<Card
					className='swipe-card'
					style={{ backgroundImage: `url(${imageSrc})` }}
				>
					<Card.Body className='swipe-overlay d-flex flex-column'>
						<div className='navigation-controls'>
							<Button
								variant='light'
								className='navigation-button prev'
								onClick={prevImage}
							>
								&lt;
							</Button>
							<Button
								variant='light'
								className='navigation-button next'
								onClick={nextImage}
							>
								&gt;
							</Button>
						</div>
						<div className='d-flex justify-content-between'>
							<Card.Title>{item.name}</Card.Title>
							<div className='badge-container d-flex align-items-start'>
								<Badge className='mx-1' bg='secondary'>
									Age: {item.age}
								</Badge>{' '}
								<Badge className='mx-1' bg='info'>
									{item.gender}
								</Badge>{' '}
								<Badge
									className='mx-1'
									bg={item.status === 'Adopted' ? 'success' : 'warning'}
								>
									{item.status}
								</Badge>
							</div>
						</div>
						<Card.Text>
							{item.short_description}{' '}
							<a href='#' onClick={toggleViewDetails}>
								See more...
							</a>
						</Card.Text>
						<div className='action-buttons mt-auto'>
							<Button
								variant='outline-danger'
								className='rounded-circle dislike'
							>
								<HandThumbsDown /> Dislike
							</Button>
							<Button variant='outline-primary' className='rounded-circle love'>
								<HeartFill /> Love
							</Button>
							<Button variant='outline-success' className='rounded-circle like'>
								<HandThumbsUp /> Like
							</Button>
						</div>
					</Card.Body>
				</Card>
			) : (
				<Card className='swipe-card detailed-view'>
					<Card.Body className='d-flex flex-column align-items-center justify-content-center'>
						<Card.Title>{item.name}</Card.Title>
						<Card.Text>{item.long_description}</Card.Text>
						<Button variant='secondary' onClick={toggleViewDetails}>
							Back
						</Button>
					</Card.Body>
				</Card>
			)}
		</div>
	);
};

export default SwipeLanding;
