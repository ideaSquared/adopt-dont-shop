import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Rescue.scss';
import LazyImage from '../../components/LazyImage'; // Import LazyImage component

const SmallNavbar = ({ activeSection, navImages }) => {
	const handleSectionChange = (sectionName) => {
		activeSection(sectionName);
	};

	return (
		<Row className='d-flex justify-content-center align-items-stretch g-2'>
			{navImages.map((img, index) => (
				<Col key={index} xs={2} className='d-flex'>
					<Card className='w-100 h-100 bg-light d-flex flex-column justify-content-center'>
						<Link
							to='#'
							className='text-decoration-none'
							onClick={() => handleSectionChange(img.component)}
						>
							<div
								className='d-flex justify-content-center align-items-center'
								style={{ height: '100%' }}
							>
								<LazyImage
									src={img.src}
									alt={img.title}
									className='img-fluid'
									style={{ maxHeight: '90%' }}
								/>
							</div>
							<Card.ImgOverlay className='d-flex justify-content-center align-items-end p-1 d-none d-md-block'>
								<Card.Title className='w-100 text-center bg-dark bg-opacity-75 text-white'>
									{img.title}
								</Card.Title>
							</Card.ImgOverlay>
						</Link>
					</Card>
				</Col>
			))}
		</Row>
	);
};

export default SmallNavbar;
