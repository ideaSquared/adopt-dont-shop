import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button, Image } from 'react-bootstrap'; // assuming you have react-bootstrap installed
import Footer from './LandingFooter';

const LandingFeatures = () => {
	return (
		<div
			style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
		>
			<Container fluid className='p-0 m-0'>
				<Row
					as='header'
					className='hero bg-primary text-white text-center py-5 mb-4'
				>
					<Col>
						<Image src='./adoptdontshoplogo.svg' fluid className='w-25' />
						<h1>Features</h1>
					</Col>
				</Row>

				<p></p>
			</Container>
			<Footer />
		</div>
	);
};

export default LandingFeatures;
``;
