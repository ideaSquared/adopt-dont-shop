import React from 'react';
import { Button, Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
	const navigate = useNavigate();

	const redirectTo = (path) => {
		navigate(path); // Navigate to the specified path
	};

	return (
		<Container>
			<Row className='justify-content-md-center'>
				<Col xs={12} md={8}>
					<h1>Admin Dashboard</h1>
					<p>
						Welcome to the Admin Dashboard. Use the buttons below to navigate to
						different sections.
					</p>
				</Col>
			</Row>
			<Row className='justify-content-md-center'>
				<Col xs={12} md={8}>
					<Button onClick={() => redirectTo('/admin/users')} className='m-2'>
						Admin Users
					</Button>
					<Button onClick={() => redirectTo('/admin/pets')} className='m-2'>
						Admin Pets
					</Button>
					<Button onClick={() => redirectTo('/admin/rescues')} className='m-2'>
						Admin Rescues
					</Button>
					<Button onClick={() => redirectTo('/admin/logs')} className='m-2'>
						Admin Logs
					</Button>
					<Button
						onClick={() => redirectTo('/admin/conversations')}
						className='m-2'
					>
						Admin Conversations
					</Button>
				</Col>
			</Row>
		</Container>
	);
};

export default AdminDashboard;
