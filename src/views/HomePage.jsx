import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap'; // assuming you have react-bootstrap installed

const HomePage = () => {
	return (
		<Container fluid className='p-0 m-0'>
			<Row
				as='header'
				className='hero bg-primary text-white text-center py-5 mb-4'
			>
				<Col>
					<h1>Welcome to Adopt Don't Shop</h1>
					<p>Find your new best friend. Adopt a pet today!</p>
					<Link to='/swipe'>
						<Button variant='light'>View Pets</Button>
					</Link>
				</Col>
			</Row>

			<Row as='section' className='mission py-4'>
				<Col md={8} className='mx-auto text-center'>
					<h2>Our Mission</h2>
					<p>
						Our mission is to connect loving homes with pets in need. With a
						community of pet lovers, we advocate for responsible pet ownership
						through adoption.
					</p>
				</Col>
			</Row>

			<Row as='section' className='how-it-works py-4 bg-light'>
				<Col md={8} className='mx-auto text-center'>
					<h2>How It Works</h2>
					<ol className='list-unstyled'>
						<li>Swipe through all the pets available in your area</li>
						<li>Learn about their needs and personality.</li>
						<li>If the rescue like you - get chatting!</li>
					</ol>
				</Col>
			</Row>

			<Row as='section' className='testimonials py-4'>
				<Col md={8} className='mx-auto text-center'>
					<h2>Happy Tails</h2>
					<blockquote className='blockquote'>
						<p>
							"Finding Luna on Adopt Don't Shop changed our lives! The process
							was so easy and the staff were incredibly helpful." - Luna's new
							family
						</p>
					</blockquote>
				</Col>
			</Row>

			<Row
				as='footer'
				className='footer bg-dark text-white text-center py-3 mt-4'
			>
				<Col>
					<p>© 2024 Adopt Don't Shop. All rights reserved.</p>
				</Col>
			</Row>
		</Container>
	);
};

export default HomePage;
``;
