import React from 'react';
import { Button, Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAdminRedirect } from './hooks/useAdminRedirect';

const AdminDashboard = () => {
	useAdminRedirect();
	const navigate = useNavigate();

	const redirectTo = (path) => {
		navigate(path); // Navigate to the specified path
	};

	return (
		<Container fluid>
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
					<Row className='g-2'>
						{' '}
						{/* Add a gap between buttons */}
						<Col>
							<Button
								onClick={() => redirectTo('/admin/users')}
								className='w-100'
							>
								Users
							</Button>
						</Col>
						<Col>
							<Button
								onClick={() => redirectTo('/admin/pets')}
								className='w-100'
							>
								Pets
							</Button>
						</Col>
						<Col>
							<Button
								onClick={() => redirectTo('/admin/rescues')}
								className='w-100'
							>
								Rescues
							</Button>
						</Col>
						<Col>
							<Button
								onClick={() => redirectTo('/admin/logs')}
								className='w-100'
							>
								Logs
							</Button>
						</Col>
						<Col>
							<Button
								onClick={() => redirectTo('/admin/conversations')}
								className='w-100'
							>
								Conversations
							</Button>
						</Col>
					</Row>
				</Col>
			</Row>
		</Container>
	);
};

export default AdminDashboard;
