import React, { useState } from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { HandThumbsDown, HeartFill, HandThumbsUp } from 'react-bootstrap-icons'; // Importing icons
import './SwipeItem.css';

const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;

// Utility Component for Badge Collection
const BadgeCollection = ({ item }) => {
	return (
		<>
			<Badge bg='secondary'>Age: {item.age}</Badge>{' '}
			<Badge bg='info'>{item.gender}</Badge>{' '}
			<Badge bg={item.status === 'Adopted' ? 'success' : 'warning'}>
				{item.status}
			</Badge>
		</>
	);
};

// Main SwipeItem Component with Centered Design
const SwipeItem = ({ item, onSwipe }) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const toggleExpand = () => setIsExpanded(!isExpanded);

	return (
		<>
			<div
				className='d-flex justify-content-center align-items-center'
				style={{ minHeight: '100vh' }}
			>
				<Card className='text-black swipe-card' onClick={toggleExpand}>
					<Card.Img
						src={
							item.images && item.images.length > 0
								? `${fileUploadsPath}${item.images[0]}`
								: 'https://dummyimage.com/600x400/000/fff&text=No+Image'
						}
						alt={item.petName}
						className='swipe-card-img'
					/>
					<Card.ImgOverlay className='d-flex flex-column justify-content-between'>
						<div>
							<Card.Title>{item.petName}</Card.Title>
							<BadgeCollection item={item} />
							<Card.Text className='mt-3'>
								{isExpanded ? item.longDescription : item.shortDescription}
							</Card.Text>
						</div>
						<div className='button-wrapper'>
							<Button variant='info' onClick={toggleExpand}>
								{isExpanded ? 'See Less' : 'See More'}
							</Button>
							<Button className='dislike' onClick={() => onSwipe('left')}>
								<HandThumbsDown /> Dislike
							</Button>
							<Button className='love' onClick={() => onSwipe('right')}>
								<HeartFill /> Love
							</Button>
							<Button className='like' onClick={() => onSwipe('right')}>
								<HandThumbsUp /> Like
							</Button>
						</div>
					</Card.ImgOverlay>
				</Card>
			</div>
		</>
	);
};

export default SwipeItem;
