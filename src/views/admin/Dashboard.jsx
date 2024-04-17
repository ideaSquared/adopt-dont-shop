import React from 'react';
import { Container } from 'react-bootstrap';
import Charts from './Charts';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';

const Dashboard = () => {
	useAdminRedirect();

	return (
		<Container>
			<Charts />
		</Container>
	);
};

export default Dashboard;
