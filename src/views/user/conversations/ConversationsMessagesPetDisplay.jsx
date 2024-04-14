import React from 'react';
import { Card, Badge, Button, Carousel } from 'react-bootstrap';

const MessagesPetDisplay = ({ petData, isExpanded, toggleHeight }) => {
	if (!petData) return null;
	const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;

	return (
		<Card
			className='mb-2 bg-info flex-row'
			style={{
				height: isExpanded ? 'auto' : '15vh',
				maxWidth: '100%',
			}}
		>
			{petData.images && petData.images.length > 0 && (
				<div style={{ width: '50%', overflow: 'hidden' }}>
					<Carousel
						style={{
							height: isExpanded ? '50vh' : '15vh',
						}}
					>
						{petData.images.map((image, index) => (
							<Carousel.Item key={index}>
								<img
									className='d-block w-100'
									src={fileUploadsPath + image}
									alt={`Slide ${index}`}
									style={{
										objectFit: 'cover',
										height: isExpanded ? '100%' : '15vh',
									}}
								/>
							</Carousel.Item>
						))}
					</Carousel>
				</div>
			)}
			<Card.Body
				className='d-flex flex-column justify-content-between'
				style={{ width: isExpanded ? 'auto' : '100%' }}
			>
				<div>
					<Card.Title>{petData.name}</Card.Title>
					<Card.Text>
						{isExpanded ? petData.long_description : petData.short_description}
					</Card.Text>
					{isExpanded && (
						<>
							<Badge bg='info'>{petData.gender}</Badge>{' '}
							<Badge bg='success'>{petData.age} years old</Badge>{' '}
							<Badge bg='warning' text='dark'>
								{petData.type}
							</Badge>{' '}
							<Badge bg='primary'>{petData.status}</Badge>
						</>
					)}
				</div>
				<Button
					variant='light'
					onClick={toggleHeight}
					className='align-self-end m-2'
				>
					{isExpanded ? 'See less' : 'See more'}
				</Button>
			</Card.Body>
		</Card>
	);
};

export default MessagesPetDisplay;
