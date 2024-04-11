import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import UsersTable from '../../components/tables/UsersTable';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import UserService from '../../services/UserService';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';
import { useAuth } from '../../contexts/AuthContext';

const Users = () => {
	const { authState } = useAuth();
	useAdminRedirect();
	const [users, setUsers] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [usersPerPage] = useState(10);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterFlags, setFilterFlags] = useState({
		forceReset: false,
		admin: false,
	});

	useEffect(() => {
		if (authState.isAdmin) {
			fetchUsers();
		}
	}, [authState.isAdmin]);

	const fetchUsers = async () => {
		try {
			const data = await UserService.fetchAdminUsers();
			setUsers(data || []);
		} catch (error) {
			console.error('Failed to fetch users:', error);
			alert('Failed to fetch users.');
		}
	};

	const handleResetPassword = async (userId) => {
		if (
			!window.confirm(
				'Are you sure you want to reset the password for this user?'
			)
		) {
			return;
		}

		try {
			await UserService.resetAdminUserPassword(userId);
			alert('Password reset successfully.');
		} catch (error) {
			console.error('Failed to reset user password:', error);
			alert('Failed to reset password. Please try again.');
		}
	};

	const handleDeleteUser = async (userId) => {
		if (!window.confirm('Are you sure you want to delete this user?')) {
			return;
		}

		try {
			await UserService.deleteAdminUser(userId);
			fetchUsers(); // Refresh the list after deletion
		} catch (error) {
			console.error('Failed to delete user:', error);
			alert('Failed to delete user. Please try again.');
		}
	};

	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
		setCurrentPage(1); // Reset to the first page for new search terms
	};

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

	const indexOfLastUser = currentPage * usersPerPage;
	const indexOfFirstUser = indexOfLastUser - usersPerPage;
	const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
	const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

	const handleFilterFlagChange = (e) => {
		const { name, checked } = e.target;

		console.log('FILTER ', name, checked);

		setFilterFlags((prevFlags) => ({
			...prevFlags,
			[name]: checked,
		}));
	};

	const filters = [
		{
			type: 'text',
			label: 'Search by Email or Name',
			value: searchTerm,
			onChange: handleSearchChange,
			placeholder: 'Enter email or name',
			md: 8,
		},
		{
			type: 'switch',
			label: 'Force Reset Flag',
			name: 'forceReset', // Make sure this matches the state property name
			checked: filterFlags.forceReset,
			onChange: handleFilterFlagChange,
			md: 2, // Column size for Bootstrap grid
		},
		{
			type: 'switch',
			label: 'Admin',
			name: 'admin', // Make sure this matches the state property name
			checked: filterFlags.admin,
			onChange: handleFilterFlagChange,
			md: 2,
		},
	];

	return (
		<Container fluid>
			<GenericFilterForm filters={filters} />
			<UsersTable
				currentUsers={currentUsers}
				onResetPassword={handleResetPassword}
				onDeleteUser={handleDeleteUser}
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
		</Container>
	);
};

export default Users;
