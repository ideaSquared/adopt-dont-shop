import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Image } from 'react-bootstrap'; // assuming you have react-bootstrap installed
import { useAuth } from '../contexts/AuthContext';
import Footer from './LandingFooter';

const HomePage = () => {
	const { authState } = useAuth();
	const navigate = useNavigate();

	const handleButtonClick = () => {
		navigate(authState.isLoggedIn ? '/swipe' : '/login');
	};

	return (
		<Container fluid className='bg-primary'>
			<Row
				as='header'
				className='hero bg-primary text-white text-center py-5 mb-4  '
			>
				<Col>
					<Image src='./adoptdontshoplogo.svg' fluid className='w-25' />
					<h1>Welcome to Adopt Don't Shop</h1>
					<Button
						variant='light'
						onClick={handleButtonClick}
						className='m-4 p-4'
					>
						Find your next pet today
					</Button>
				</Col>
			</Row>
			<Footer />
		</Container>
	);
};

export default HomePage;
