import React from 'react';
import { Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useLogout';
import './Navbar.scss';

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
	const iconSize = 30;

	return (
		<Nav
			className='fixed-bottom border-top text-center custom-navbar'
			style={{ width: '100%', justifyContent: 'space-around' }}
		>
			{!authState.isLoggedIn ? (
				<>
					<LinkContainer to='/login'>
						<Nav.Link>
							<BoxArrowRight size={iconSize} />
							<div>Login</div>
						</Nav.Link>
					</LinkContainer>
					<LinkContainer to='/create-account'>
						<Nav.Link>
							<PlusCircle size={iconSize} />
							<div>Create Account</div>
						</Nav.Link>
					</LinkContainer>
				</>
			) : (
				<>
					<LinkContainer to='/'>
						<Nav.Link>
							<HouseDoor size={iconSize} />
							<div>Home</div>
						</Nav.Link>
					</LinkContainer>
					<LinkContainer to='/adopter-conversations'>
						<Nav.Link>
							<ChatRightText size={iconSize} />
							<div>Messages</div>
						</Nav.Link>
					</LinkContainer>
					<LinkContainer to='/my-profile'>
						<Nav.Link>
							<PersonCircle size={iconSize} />
							<div>My Profile</div>
						</Nav.Link>
					</LinkContainer>
					{authState.isAdmin && (
						<LinkContainer to='/admin'>
							<Nav.Link>
								<Eye size={iconSize} />
								<div>Admin</div>
							</Nav.Link>
						</LinkContainer>
					)}
					{authState.isRescue && (
						<LinkContainer to='/rescue-profile'>
							<Nav.Link>
								<Briefcase size={iconSize} />
								<div>Rescue Profile</div>
							</Nav.Link>
						</LinkContainer>
					)}
					<Nav.Link onClick={handleLogout}>
						<BoxArrowRight size={iconSize} />
						<div>Logout</div>
					</Nav.Link>
				</>
			)}
		</Nav>
	);
};

export default CustomNavbar;
