// Users.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Table, Container, Badge, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth hook

axios.defaults.withCredentials = true;

const Users = () => {
	const [users, setUsers] = useState([]);
	const navigate = useNavigate(); // Hook for navigation
	const { isAdmin } = useAuth(); // Use useAuth hook to access isAdmin
	const [searchTerm, setSearchTerm] = useState('');
	const [filterFlags, setFilterFlags] = useState({
		forceReset: false,
		admin: false,
	});

	useEffect(() => {
		if (!isAdmin) {
			navigate('/'); // Redirect to root if not admin
			return; // Prevent further execution
		}
		fetchUsers();
	}, [isAdmin, navigate]);

	const fetchUsers = async () => {
		// Adapt endpoint as needed
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/users`;
		try {
			const res = await axios.get(endpoint);
			if (Array.isArray(res.data)) {
				setUsers(res.data);
			} else {
				console.error('Data is not an array:', res.data);
				setUsers([]); // Handle non-array data
			}
		} catch (error) {
			alert('Failed to fetch users.');
			console.error(error);
		}
	};

	const deleteUser = async (id) => {
		// Confirmation dialog
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this user?'
		);
		if (!isConfirmed) {
			return; // Stop the function if the user cancels the action
		}
		try {
			await axios.delete(
				`${import.meta.env.VITE_API_BASE_URL}/admin/users/delete/${id}`
			);
			fetchUsers(); // Refresh the list after deleting
		} catch (error) {
			alert('Failed to delete user. Make sure you are logged in as an admin.');
			console.error(error);
		}
	};

	const resetPassword = async (id) => {
		// Confirmation dialog
		const isConfirmed = window.confirm(
			'Are you sure you want to reset the password for this user?'
		);
		if (!isConfirmed) {
			return; // Stop the function if the user cancels the action
		}
		try {
			await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/admin/users/reset-password/${id}`
			);
			alert('Password reset forced successfully');
		} catch (error) {
			alert(
				'Failed to reset password. Make sure you are logged in as an admin.'
			);
			console.error(error);
		}
	};

	// Handler for search term changes
	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
	};

	// Handler for filter flag changes
	const handleFilterFlagChange = (e) => {
		setFilterFlags((prev) => ({ ...prev, [e.target.name]: e.target.checked }));
	};

	// Filter users based on search term and flags
	const filteredUsers = users.filter((user) => {
		const searchMatch =
			user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.firstName.toLowerCase().includes(searchTerm.toLowerCase());
		const forceResetMatch = filterFlags.forceReset
			? user.resetTokenForceFlag
			: true;
		const adminMatch = filterFlags.admin ? user.isAdmin : true;
		return searchMatch && forceResetMatch && adminMatch;
	});

	return (
		<Container>
			<div className='mt-3 mb-3'>
				<Form>
					<Form.Group className='mb-3' controlId='search'>
						<Form.Control
							type='text'
							placeholder='Search by email or first name'
							onChange={handleSearchChange}
						/>
					</Form.Group>
					<Form.Check
						inline
						label='Force Reset Password'
						name='forceReset'
						type='checkbox'
						onChange={handleFilterFlagChange}
					/>
					<Form.Check
						inline
						label='Admin'
						name='admin'
						type='checkbox'
						onChange={handleFilterFlagChange}
					/>
				</Form>
				<Table striped bordered hover>
					<thead>
						<tr>
							<th>First name</th>
							<th>Email</th>
							<th>Flags</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{filteredUsers.map((user) => (
							<tr key={user._id}>
								<td>{user.firstName}</td>
								<td>{user.email}</td>
								<td>
									{/* Conditional Badge Rendering */}
									{user.resetTokenForceFlag && (
										<Badge bg='info' className='me-2'>
											Force reset password
										</Badge>
									)}
									{user.isAdmin && <Badge bg='success'>Admin</Badge>}
								</td>
								<td>
									<Button
										variant='warning'
										onClick={() => resetPassword(user._id)}
									>
										Force reset password
									</Button>{' '}
									<Button variant='danger' onClick={() => deleteUser(user._id)}>
										Delete
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
			</div>
		</Container>
	);
};

export default Users;
