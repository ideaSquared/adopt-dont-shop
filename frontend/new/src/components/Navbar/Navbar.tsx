import React, { useState } from 'react';
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
	position: relative;
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

const Dropdown = styled.ul<{ isOpen: boolean }>`
	display: ${(props) => (props.isOpen ? 'block' : 'none')};
	position: absolute;
	top: 100%;
	left: 0;
	background-color: ${(props) => props.theme.background.content};
	border: 1px solid ${(props) => props.theme.border.content};
	list-style-type: none;
	padding: 0.5rem 0;
	margin: 0;
`;

const DropdownItem = styled.li`
	margin: 0;
`;

const DropdownLink = styled(Link)`
	display: block;
	padding: 0.5rem 1rem;
	color: ${(props) => props.theme.text.body};
	text-decoration: none;

	&:hover {
		background-color: ${(props) => props.theme.background.highlight};
		color: ${(props) => props.theme.text.highlight};
	}
`;

const AccountLink = styled.span`
	color: ${(props) => props.theme.text.body};
	font-weight: bold;
	cursor: pointer;

	&:hover {
		color: ${(props) => props.theme.text.highlight};
		text-decoration: underline;
	}
`;

const Navbar: React.FC = () => {
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const toggleDropdown = () => {
		setDropdownOpen(!dropdownOpen);
	};

	return (
		<StyledNavbar>
			<Nav>
				<NavList>
					<NavItem>
						<NavLink to='/'>Home</NavLink>
					</NavItem>
					<NavItem onMouseEnter={toggleDropdown} onMouseLeave={toggleDropdown}>
						<AccountLink>Account</AccountLink>
						<Dropdown isOpen={dropdownOpen}>
							<DropdownItem>
								<DropdownLink to='/login'>Login</DropdownLink>
							</DropdownItem>
							<DropdownItem>
								<DropdownLink to='/create-account'>Create Account</DropdownLink>
							</DropdownItem>
							<DropdownItem>
								<DropdownLink to='/forgot-password'>
									Forgot Password
								</DropdownLink>
							</DropdownItem>
							<DropdownItem>
								<DropdownLink to='/reset-password'>Reset Password</DropdownLink>
							</DropdownItem>
							<DropdownItem>
								<DropdownLink to='/settings'>Settings</DropdownLink>
							</DropdownItem>
						</Dropdown>
					</NavItem>
				</NavList>
			</Nav>
		</StyledNavbar>
	);
};

export default Navbar;
