import React from 'react';
import { Container, Row, Col, Card, Badge, Carousel } from 'react-bootstrap';

const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;

const SwipePet = ({ item }) => {
	return (
		<Container className='mt-4'>
			<Card>
				<Card.Body>
					<Row>
						<PetCarousel images={item.images} />
						<PetDetails item={item} />
					</Row>
				</Card.Body>
			</Card>
		</Container>
	);
};

const PetCarousel = ({ images }) => (
	<Col md={6}>
		<Carousel>
			{images && images.length > 0 ? (
				images.map((img, index) => (
					<Carousel.Item key={index}>
						<img
							className='d-block w-100'
							src={fileUploadsPath + img}
							alt={`Slide ${index + 1}`}
						/>
					</Carousel.Item>
				))
			) : (
				<Carousel.Item>
					<img
						className='d-block w-100'
						src='https://dummyimage.com/600x400/000/fff&text=No+Image'
						alt='No images available'
					/>
				</Carousel.Item>
			)}
		</Carousel>
	</Col>
);

const PetDetails = ({ item }) => (
	<Col md={6}>
		<h3>
			{item.petName} <Badge bg='primary'>{item.type}</Badge>
		</h3>
		<p>{item.longDescription}</p>
		<BadgeCollection item={item} />
		<Characteristics characteristics={item.characteristics} />
	</Col>
);

const BadgeCollection = ({ item }) => (
	<div>
		<Badge bg='secondary' className='me-2'>
			Age: {item.age}
		</Badge>
		<Badge bg='info'>{item.gender}</Badge>
		<Badge
			bg={item.status === 'Available' ? 'success' : 'warning'}
			className='me-2'
		>
			{item.status}
		</Badge>
	</div>
);

const Characteristics = ({ characteristics }) => (
	<div className='mt-3'>
		{characteristics &&
			Object.entries(characteristics).map(([key, value]) =>
				Object.entries(value).map(([subKey, subValue]) => (
					<CharacteristicBadge
						key={subKey}
						label={subKey.replace(/_/g, ' ')}
						value={subValue}
					/>
				))
			)}
	</div>
);

const CharacteristicBadge = ({ label, value }) => (
	<Badge bg='light' text='dark' className='me-2'>{`${capitalizeFirstLetter(
		label
	)}: ${value}`}</Badge>
);

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

export default SwipePet;
