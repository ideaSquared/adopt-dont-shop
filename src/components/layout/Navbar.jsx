import React from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import {
	Container,
	Row,
	Col,
	Button,
	ButtonGroup,
	Dropdown,
	DropdownButton,
} from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useLogout';

// Import the icons with specific sizes
import {
	PersonCircle,
	ChatRightText,
	BoxArrowRight,
	PlusCircle,
	HouseDoor,
	Briefcase,
	Eye,
} from 'react-bootstrap-icons';

const CustomNavbar = () => {
	const { authState } = useAuth();
	const handleLogout = useLogout();

	return (
		<Container fluid>
			<Row className='justify-content-around text-center'>
				<ButtonGroup
					className='d-flex w-100 justify-content-around m-0 p-0'
					style={{ borderRadius: '0' }}
				>
					{!authState.isLoggedIn ? (
						<>
							<LinkContainer to='/login' style={{ borderRadius: '0' }}>
								<Button
									variant='primary'
									className='p-3 d-flex flex-column align-items-center justify-content-center'
								>
									<BoxArrowRight className='icon' />
									<span className='d-none d-sm-inline'>Login</span>
								</Button>
							</LinkContainer>
							<LinkContainer to='/create-account' style={{ borderRadius: '0' }}>
								<Button
									variant='info'
									className='p-3 d-flex flex-column align-items-center justify-content-center'
								>
									<PlusCircle className='icon' />
									<span className='d-none d-sm-inline'>Create Account</span>
								</Button>
							</LinkContainer>
						</>
					) : (
						<>
							<LinkContainer to='/swipe' style={{ borderRadius: '0' }}>
								<Button
									variant='primary'
									className='p-3 d-flex flex-column align-items-center justify-content-center'
								>
									<HouseDoor className='icon' />
									<span className='d-none d-sm-inline'>Swipe</span>
								</Button>
							</LinkContainer>
							<LinkContainer
								to='/adopter-conversations'
								style={{ borderRadius: '0' }}
							>
								<Button
									variant='success'
									className='p-3 d-flex flex-column align-items-center justify-content-center'
								>
									<ChatRightText className='icon' />
									<span className='d-none d-sm-inline'>Messages</span>
								</Button>
							</LinkContainer>

							<LinkContainer to='/my-profile' style={{ borderRadius: '0' }}>
								<Button
									variant='info'
									className='p-3 d-flex flex-column align-items-center justify-content-center'
								>
									<PersonCircle className='icon' />
									<span className='d-none d-sm-inline'>My Profile</span>
								</Button>
							</LinkContainer>

							{authState.isAdmin && (
								<LinkContainer to='/admin' style={{ borderRadius: '0' }}>
									<Button
										variant='info'
										className='p-3 d-flex flex-column align-items-center justify-content-center'
									>
										<Eye className='icon' />
										<span className='d-none d-sm-inline'>Admin</span>
									</Button>
								</LinkContainer>
							)}
							{authState.isRescue && (
								<LinkContainer
									to='/rescue-profile'
									style={{ borderRadius: '0' }}
								>
									<Button
										variant='info'
										className='p-3 d-flex flex-column align-items-center justify-content-center'
									>
										<Briefcase className='icon' />
										<span className='d-none d-sm-inline'>Rescue Profile</span>
									</Button>
								</LinkContainer>
							)}
							<Button
								variant='warning'
								className='p-3 d-flex flex-column align-items-center justify-content-center'
								style={{ borderRadius: '0' }}
								onClick={handleLogout}
							>
								<BoxArrowRight className='icon' />
								<span className='d-none d-sm-inline'>Logout</span>
							</Button>
						</>
					)}
				</ButtonGroup>
			</Row>
		</Container>
	);
};

export default CustomNavbar;
