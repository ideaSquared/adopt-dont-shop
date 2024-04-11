import React, { useState } from 'react';
import { Button, Container, Row, Col } from 'react-bootstrap';

import { useAdminRedirect } from '../../hooks/useAdminRedirect';
import Dashboard from './Dashboard';
import Conversations from './Conversations';
import Logs from './Logs';
import Pets from './Pets';
import Rescues from './Rescues';
import Users from './Users';

const AdminLanding = () => {
	useAdminRedirect();
	const [view, setView] = useState('Dashboard');

	// Function to change view based on sidebar interaction
	const changeView = (viewName) => {
		setView(viewName);
	};

	return (
		<Container fluid>
			<Row>
				<Col xs={12} md={2} className='min-vh-100 bg-light'>
					<div className='d-flex flex-column align-items-start p-3'>
						<h2>Navigation</h2>
						<Button
							onClick={() => changeView('Dashboard')}
							className='w-100 my-1'
						>
							Dashboard
						</Button>
						<Button onClick={() => changeView('Users')} className='w-100 my-1'>
							Users
						</Button>
						<Button onClick={() => changeView('Pets')} className='w-100 my-1'>
							Pets
						</Button>
						<Button
							onClick={() => changeView('Rescues')}
							className='w-100 my-1'
						>
							Rescues
						</Button>
						<Button onClick={() => changeView('Logs')} className='w-100 my-1'>
							Logs
						</Button>
						<Button
							onClick={() => changeView('Conversations')}
							className='w-100 my-1'
						>
							Conversations
						</Button>
					</div>
				</Col>
				<Col xs={12} md={10} className='bg-white p-4'>
					<h1>Admin Dashboard</h1>
					{/* Render content based on current view */}
					{view === 'Dashboard' && <Dashboard />}
					{view === 'Users' && <Users />}
					{view === 'Pets' && <Pets />}
					{view === 'Rescues' && <Rescues />}
					{view === 'Logs' && <Logs />}
					{view === 'Conversations' && <Conversations />}
				</Col>
			</Row>
		</Container>
	);
};

export default AdminLanding;
