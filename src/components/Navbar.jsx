// Navbar.jsx
import React from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import { useAuth } from './AuthContext';
import { useLogout } from './hooks/useLogout'; // Adjust the path as necessary

const CustomNavbar = () => {
	const { isLoggedIn, logout, isAdmin, isRescue } = useAuth(); // Assuming isAdmin is part of your auth context
	const handleLogout = useLogout();

	return (
		<Navbar bg='light' expand='lg' className='bg-body-tertiary rounded'>
			<Container fluid>
				<LinkContainer to='/'>
					<Navbar.Brand>AdoptDontShop</Navbar.Brand>
				</LinkContainer>
				<Navbar.Toggle aria-controls='navbarScroll' />
				<Navbar.Collapse id='navbarScroll'>
					<Nav
						className='me-auto my-2 my-lg-0'
						style={{ maxHeight: '100px' }}
						navbarScroll
					>
						<LinkContainer to='/'>
							<Nav.Link>Home</Nav.Link>
						</LinkContainer>
						{/* Optionally include other NavLinks here */}
					</Nav>
					<div className='d-flex'>
						{!isLoggedIn ? (
							<>
								<LinkContainer to='/login'>
									<Button variant='primary' className='mx-2'>
										Login
									</Button>
								</LinkContainer>
								<LinkContainer to='/create-account'>
									<Button variant='primary' className='mx-2'>
										Create Account
									</Button>
								</LinkContainer>
							</>
						) : (
							<>
								<LinkContainer to='/my-profile'>
									<Button variant='secondary' className='mx-2'>
										My Profile
									</Button>
								</LinkContainer>
								{isAdmin && (
									<LinkContainer to='/admin'>
										<Button variant='warning' className='mx-2'>
											Admin
										</Button>
									</LinkContainer>
								)}
								{isRescue && (
									<LinkContainer to='/rescue-profile'>
										<Button variant='info' className='mx-2'>
											{' '}
											{/* Adjust the variant as needed */}
											Rescue Profile
										</Button>
									</LinkContainer>
								)}
								<Button
									onClick={handleLogout}
									variant='primary'
									className='mx-2'
								>
									Logout
								</Button>
							</>
						)}
					</div>
				</Navbar.Collapse>
			</Container>
		</Navbar>
	);
};

export default CustomNavbar;
