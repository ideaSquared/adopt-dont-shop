import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const StyledHeader = styled.header`
	background-color: ${(props) => props.theme.background.content};
	color: ${(props) => props.theme.text.body};
	padding: 1rem;
	text-align: center;
	border-bottom: 1px solid ${(props) => props.theme.border.content};
`;

const Header: React.FC = () => {
	return (
		<StyledHeader>
			<nav>
				<ul>
					<li>
						<Link to='/'>Home</Link>
					</li>
					<li>
						<Link to='/users'>Users</Link>
					</li>
					<li>
						<Link to='/login'>Login</Link>
					</li>
					<li>
						<Link to='/create-account'>Create Account</Link>
					</li>
				</ul>
			</nav>
		</StyledHeader>
	);
};

export default Header;
