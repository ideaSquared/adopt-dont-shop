import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Container, Table, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true;

const Rescues = () => {
	const [rescues, setRescues] = useState([]);
	const [filterType, setFilterType] = useState('');
	const [searchName, setSearchName] = useState('');
	const [searchEmail, setSearchEmail] = useState('');
	const navigate = useNavigate();
	const { isAdmin } = useAuth();

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		fetchRescues();
	}, [isAdmin, navigate]);

	const fetchRescues = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/rescues`;
		try {
			const res = await axios.get(endpoint);
			if (Array.isArray(res.data)) {
				setRescues(res.data);
			} else {
				console.error('Data is not an array:', res.data);
				setRescues([]);
			}
		} catch (error) {
			alert('Failed to fetch rescues.');
			console.error(error);
		}
	};

	const deleteRescue = async (id) => {
		try {
			await axios.delete(
				`${import.meta.env.VITE_API_BASE_URL}/admin/rescues/${id}`
			);
			fetchRescues(); // Refresh the list after deleting
		} catch (error) {
			alert(
				'Failed to delete rescue. Make sure you are logged in as an admin.'
			);
			console.error(error);
		}
	};

	const filteredRescues = rescues
		.filter((rescue) => (filterType ? rescue.rescueType === filterType : true))
		.filter(
			(rescue) =>
				// Include rescue if searchName is empty or if rescueName matches searchName
				searchName === '' ||
				rescue.rescueName?.toLowerCase().includes(searchName.toLowerCase())
		)
		.filter((rescue) =>
			rescue.staff?.some(
				(staffMember) =>
					staffMember.userDetails &&
					staffMember.userDetails.email
						.toLowerCase()
						.includes(searchEmail.toLowerCase())
			)
		);

	return (
		<Container>
			<div className='mt-3 mb-3'>
				<Form>
					<Form.Group className='mb-3' controlId='filterType'>
						<Form.Label>Filter by Type</Form.Label>
						<Form.Control
							as='select'
							value={filterType}
							onChange={(e) => setFilterType(e.target.value)}
						>
							<option value=''>All Types</option>
							<option value='Individual'>Individual</option>
							<option value='Charity'>Charity</option>
							<option value='Company'>Company</option>
						</Form.Control>
					</Form.Group>
					<Form.Group className='mb-3' controlId='searchName'>
						<Form.Label>Search by Name</Form.Label>
						<Form.Control
							type='text'
							placeholder='Search by rescue name'
							value={searchName}
							onChange={(e) => setSearchName(e.target.value)}
						/>
					</Form.Group>
					<Form.Group className='mb-3' controlId='searchEmail'>
						<Form.Label>Search by Staff Email</Form.Label>
						<Form.Control
							type='text'
							placeholder='Search by staff email'
							value={searchEmail}
							onChange={(e) => setSearchEmail(e.target.value)}
						/>
					</Form.Group>
				</Form>
			</div>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>Rescue Name</th>
						<th>Type</th>
						<th>Actions</th>
						<th>Staff</th>
					</tr>
				</thead>
				<tbody>
					{filteredRescues.map((rescue) => (
						<tr key={rescue._id}>
							<td>{rescue.rescueName ?? ''}</td>
							<td>{rescue.rescueType ?? 'Type Unavailable'}</td>
							<td>
								{rescue.staff.map((staffMember, index) => (
									<div key={index}>
										{staffMember.userDetails?.email ?? 'Email not available'}
									</div>
								))}
							</td>
							<td>
								<Button
									variant='danger'
									onClick={() => deleteRescue(rescue._id)}
								>
									Delete
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
		</Container>
	);
};

export default Rescues;
