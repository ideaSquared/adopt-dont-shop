// Users.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth hook

axios.defaults.withCredentials = true;

const Users = () => {
	const [users, setUsers] = useState([]);
	const navigate = useNavigate(); // Hook for navigation
	const { isAdmin } = useAuth(); // Use useAuth hook to access isAdmin

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
		try {
			const newPassword = prompt('Enter new password:');
			await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/admin/users/reset-password/${id}`,
				{
					password: newPassword,
				}
			);
			alert('Password reset successfully');
		} catch (error) {
			alert(
				'Failed to reset password. Make sure you are logged in as an admin.'
			);
			console.error(error);
		}
	};

	return (
		<Table striped bordered hover>
			<thead>
				<tr>
					<th>Email</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{users.map((user) => (
					<tr key={user._id}>
						<td>{user.email}</td>
						<td>
							<Button variant='danger' onClick={() => deleteUser(user._id)}>
								Delete
							</Button>{' '}
							<Button variant='warning' onClick={() => resetPassword(user._id)}>
								Reset Password
							</Button>
						</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default Users;
