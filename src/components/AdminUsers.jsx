// AdminUsers.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Table, Container, Badge, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import PaginationControls from './PaginationControls';
import StatusBadge from './StatusBadge';

axios.defaults.withCredentials = true;

const Users = () => {
	const [users, setUsers] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [usersPerPage] = useState(10); // Define how many users per page
	const navigate = useNavigate();
	const { isAdmin } = useAuth();
	const [searchTerm, setSearchTerm] = useState('');
	const [filterFlags, setFilterFlags] = useState({
		forceReset: false,
		admin: false,
	});

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		fetchUsers();
	}, [isAdmin]); // navigate is stable, no need to include in deps

	const fetchUsers = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/users`;
		try {
			const { data } = await axios.get(endpoint);
			if (Array.isArray(data)) {
				setUsers(data);
			} else {
				console.error('Data is not an array:', data);
			}
		} catch (error) {
			alert('Failed to fetch users.');
			console.error(error);
		}
	};

	const handleUserAction = async (id, action) => {
		const actionMessages = {
			delete: 'delete this user',
			resetPassword: 'reset the password for this user',
		};
		const isConfirmed = window.confirm(
			`Are you sure you want to ${actionMessages[action]}?`
		);
		if (!isConfirmed) return;

		try {
			const actionEndpoints = {
				delete: `/admin/users/delete/${id}`,
				resetPassword: `/admin/users/reset-password/${id}`,
			};
			await axios[action === 'delete' ? 'delete' : 'post'](
				`${import.meta.env.VITE_API_BASE_URL}${actionEndpoints[action]}`
			);
			action === 'delete'
				? fetchUsers()
				: alert('Password reset forced successfully');
		} catch (error) {
			alert(`Failed to ${action}. Make sure you are logged in as an admin.`);
			console.error(error);
		}
	};

	const handleSearchChange = (e) => setSearchTerm(e.target.value);
	const handleFilterFlagChange = (e) =>
		setFilterFlags((prev) => ({ ...prev, [e.target.name]: e.target.checked }));

	const filteredUsers = users.filter((user) => {
		const searchMatch = searchTerm
			.toLowerCase()
			.split(' ')
			.some(
				(term) =>
					user.email.toLowerCase().includes(term) ||
					user.firstName.toLowerCase().includes(term)
			);
		const forceResetMatch = filterFlags.forceReset
			? user.resetTokenForceFlag
			: true;
		const adminMatch = filterFlags.admin ? user.isAdmin : true;
		return searchMatch && forceResetMatch && adminMatch;
	});

	// Pagination logic
	const indexOfLastUser = currentPage * usersPerPage;
	const indexOfFirstUser = indexOfLastUser - usersPerPage;
	const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
	const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

	return (
		<Container fluid>
			<div className='mt-3 mb-3'>
				<Form>
					{/* Search and Filter Form */}
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
						{currentUsers.map((user) => (
							<tr key={user._id}>
								<td>{user.firstName}</td>
								<td>{user.email}</td>{' '}
								<td>
									{user.resetTokenForceFlag && (
										<StatusBadge
											type='misc'
											value='Force Reset Flag'
										></StatusBadge>
									)}
									{user.isAdmin && (
										<StatusBadge type='misc' value='Admin'></StatusBadge>
									)}
								</td>
								<td>
									<Button
										variant='warning'
										onClick={() => handleUserAction(user._id, 'resetPassword')}
										className='me-2'
									>
										Reset Password
									</Button>
									<Button
										variant='danger'
										onClick={() => handleUserAction(user._id, 'delete')}
									>
										Delete
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
				<PaginationControls
					currentPage={currentPage}
					totalPages={totalPages}
					onChangePage={setCurrentPage}
				/>
			</div>
		</Container>
	);
};

export default Users;
