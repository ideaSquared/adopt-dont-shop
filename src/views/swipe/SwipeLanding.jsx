import React, { useState } from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { HandThumbsDown, HeartFill, HandThumbsUp } from 'react-bootstrap-icons';
import './Swipe.scss';

const SwipeLanding = ({ item, handleSwipe }) => {
	const [viewDetails, setViewDetails] = useState(false);
	const toggleViewDetails = () => setViewDetails(!viewDetails);
	const [animationClass, setAnimationClass] = useState('');

	const images = item.images || [];
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const basePath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;
	const fallbackImage = 'https://placehold.it/500';
	const imageSrc = images.length
		? `${basePath}${images[currentImageIndex]}`
		: fallbackImage;

	const nextImage = () =>
		setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
	const prevImage = () =>
		setCurrentImageIndex((prevIndex) =>
			prevIndex - 1 < 0 ? images.length - 1 : prevIndex - 1
		);

	const handleAction = (action) => {
		switch (action) {
			case 'left':
				setAnimationClass('fly-out-left');
				break;
			case 'right':
				setAnimationClass('fly-out-right');
				break;
			case 'love':
				setAnimationClass('fly-out-top');
				break;
			default:
				return; // No action
		}

		setTimeout(() => {
			handleSwipe(action); // Call the handleSwipe prop with the action
			setAnimationClass(''); // Reset animation class after it finishes
		}, 500); // This should match the duration of the animations
	};

	return (
		<div className='d-flex align-items-center justify-content-center swipe-screen my-sm-3'>
			{!viewDetails ? (
				<Card
					className={`swipe-card ${animationClass}`}
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
								</Badge>
								<Badge className='mx-1' bg='info'>
									{item.gender}
								</Badge>
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
							<a
								href='#'
								onClick={(e) => {
									e.preventDefault();
									toggleViewDetails();
								}}
							>
								See more...
							</a>
						</Card.Text>
						<div className='action-buttons mt-auto'>
							<Button
								variant='danger'
								className='rounded-circle dislike'
								onClick={() => handleAction('left')}
								aria-label='Dislike'
							>
								<HandThumbsDown />
								<span className='visually-hidden'>Dislike</span>
							</Button>
							<Button
								variant='primary'
								className='rounded-circle love'
								onClick={() => handleAction('love')}
								aria-label='Love'
							>
								<HeartFill />
								<span className='visually-hidden'>Love</span>
							</Button>
							<Button
								variant='success'
								className='rounded-circle like'
								onClick={() => handleAction('right')}
								aria-label='Like'
							>
								<HandThumbsUp />
								<span className='visually-hidden'>Like</span>
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
