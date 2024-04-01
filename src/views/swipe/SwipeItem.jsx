import React, { useState } from 'react';
import {
	Modal,
	Card,
	Badge,
	Button,
	Carousel,
	Row,
	Col,
	Container,
} from 'react-bootstrap';
import SwipePet from './SwipePet';
import Swipeable from './Swipeable';

const SwipeItem = ({ item, onSwipe }) => {
	const fallbackImage =
		'https://dummyimage.com/600x400/000/fff&text=I%27m+sure+they%27re+pretty!';
	const [show, setShow] = useState(false);

	const handleClose = () => setShow(false);
	const handleShow = () => setShow(true);

	return (
		<Swipeable onSwipe={onSwipe}>
			<Card className='mb-4'>
				<Row noGutters>
					<Col xs={12} md={3}>
						<ItemCarousel images={item.images} fallbackImage={fallbackImage} />
					</Col>
					<Col xs={12} md={9}>
						<Card.Body>
							<Card.Title>
								{item.petName} <Badge bg='primary'>{item.type}</Badge>
							</Card.Title>
							<Card.Text>{item.shortDescription}</Card.Text>
							<PetBadges item={item} />
							<LearnMoreButton handleShow={handleShow} />
						</Card.Body>
					</Col>
				</Row>
			</Card>
			<PetModal show={show} handleClose={handleClose} item={item} />
		</Swipeable>
	);
};

const ItemCarousel = ({ images, fallbackImage }) => (
	<Carousel>
		{(images && images.length > 0 ? images : [fallbackImage]).map(
			(image, index) => (
				<Carousel.Item key={index}>
					<img
						className='d-block w-100'
						src={image}
						alt={`Slide ${index + 1}`}
					/>
				</Carousel.Item>
			)
		)}
	</Carousel>
);

const PetBadges = ({ item }) => (
	<div>
		<div className='mb-2'>
			<Badge bg='secondary'>Age: {item.age}</Badge>{' '}
			<Badge bg='info'>{item.gender}</Badge>
		</div>
		<div className='mb-2'>
			<Badge bg={item.status === 'Adopted' ? 'success' : 'warning'}>
				{item.status}
			</Badge>
		</div>
	</div>
);

const LearnMoreButton = ({ handleShow }) => (
	<Container className='mt-auto'>
		<Row>
			<Col className='d-flex justify-content-end'>
				<Button variant='outline-primary' onClick={handleShow}>
					Learn More
				</Button>
			</Col>
		</Row>
	</Container>
);

const PetModal = ({ show, handleClose, item }) => (
	<Modal show={show} onHide={handleClose} size='lg'>
		<Modal.Body>
			<SwipePet item={item} />
		</Modal.Body>
		<Modal.Footer>
			<Button variant='secondary' onClick={handleClose}>
				Close
			</Button>
		</Modal.Footer>
	</Modal>
);

export default SwipeItem;
