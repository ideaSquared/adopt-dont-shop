// Navbar.jsx
import React from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { Navbar, Nav, Button, Container, Dropdown } from 'react-bootstrap';
import { useAuth } from './AuthContext';
import { useLogout } from './hooks/useLogout'; // Adjust the path as necessary

const CustomNavbar = () => {
	const { isLoggedIn, isAdmin, userPermissions } = useAuth();
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
								<LinkContainer to='/messages'>
									<Button variant='primary' className='mx-2'>
										Messages
									</Button>
								</LinkContainer>
								<Dropdown className='mx-2' align={{ lg: 'end ' }}>
									<Dropdown.Toggle variant='secondary' id='dropdown-settings'>
										Settings
									</Dropdown.Toggle>

									<Dropdown.Menu>
										<LinkContainer to='/my-profile'>
											<Dropdown.Item>My Profile</Dropdown.Item>
										</LinkContainer>

										{isAdmin && (
											<LinkContainer to='/admin'>
												<Dropdown.Item>Admin</Dropdown.Item>
											</LinkContainer>
										)}

										{userPermissions && (
											<LinkContainer to='/rescue-profile'>
												<Dropdown.Item>Rescue Profile</Dropdown.Item>
											</LinkContainer>
										)}

										<Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
									</Dropdown.Menu>
								</Dropdown>
							</>
						)}
					</div>
				</Navbar.Collapse>
			</Container>
		</Navbar>
	);
};

export default CustomNavbar;
