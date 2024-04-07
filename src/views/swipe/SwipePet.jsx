import React from 'react';
import { Container, Row, Col, Card, Image } from 'react-bootstrap';
import { BadgeCollection } from './SwipeComponents'; // Assuming BadgeCollection is extracted to SwipeComponents.js

const SwipePet = ({ item }) => {
	return (
		<Container>
			<Card>
				<Row noGutters className='g-0'>
					<Col md={6}>
						<Image
							src={`${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/${
								item.images[0]
							}`}
							alt={item.petName}
							fluid
						/>
					</Col>
					<Col md={6}>
						<Card.Body>
							<Card.Title>{item.petName}</Card.Title>
							<Card.Text>{item.longDescription}</Card.Text>
							<BadgeCollection item={item} />
						</Card.Body>
					</Col>
				</Row>
			</Card>
		</Container>
	);
};

export default SwipePet;
