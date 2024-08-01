import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const StyledNavbar = styled.header`
	background-color: ${(props) => props.theme.background.content};
	color: ${(props) => props.theme.text.body};
	padding: 1rem 2rem;
	border-bottom: 1px solid ${(props) => props.theme.border.content};
`;

const Nav = styled.nav`
	display: flex;
	justify-content: center;
	align-items: center;
`;

const NavList = styled.ul`
	display: flex;
	list-style-type: none;
	margin: 0;
	padding: 0;
`;

const NavItem = styled.li`
	margin: 0 1rem;
`;

const NavLink = styled(Link)`
	color: ${(props) => props.theme.text.body};
	text-decoration: none;
	font-weight: bold;

	&:hover {
		color: ${(props) => props.theme.text.highlight};
		text-decoration: underline;
	}
`;

const Navbar: React.FC = () => {
	return (
		<StyledNavbar>
			<Nav>
				<NavList>
					<NavItem>
						<NavLink to='/'>Home</NavLink>
					</NavItem>
					<NavItem>
						<NavLink to='/users'>Users</NavLink>
					</NavItem>
					<NavItem>
						<NavLink to='/login'>Login</NavLink>
					</NavItem>
					<NavItem>
						<NavLink to='/create-account'>Create Account</NavLink>
					</NavItem>
					<NavItem>
						<NavLink to='/forgot-password'>Forgot Password</NavLink>
					</NavItem>
					<NavItem>
						<NavLink to='/reset-password'>Reset Password</NavLink>
					</NavItem>
				</NavList>
			</Nav>
		</StyledNavbar>
	);
};

export default Navbar;
