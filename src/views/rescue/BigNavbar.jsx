import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Rescue.scss';
import LazyImage from '../../components/LazyImage';

const BigNavbar = ({ activeSection, navImages }) => {
	const handleSectionChange = (sectionName) => {
		activeSection(sectionName);
	};

	return (
		<Row className='justify-content-center g-4'>
			{navImages.map((img, index) => (
				<Col
					key={index}
					md={6}
					lg={4}
					xs={12}
					className='d-flex align-items-stretch'
				>
					<Card className='w-100 shadow-sm hover-shadow bg-info card-hover-darken'>
						<Link
							to='#'
							className='text-decoration-none'
							onClick={() => handleSectionChange(img.component)}
						>
							<LazyImage
								src={img.src}
								alt={img.title}
								className='img-fluid image-fixed-height img-hover-darken'
							/>
							<Card.ImgOverlay className='d-flex align-items-end p-0'>
								<Card.Title className='text-center w-100 bg-light text-black bg-opacity-50 py-2'>
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

export default BigNavbar;
