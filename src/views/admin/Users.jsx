import React, { useState, useEffect } from 'react';
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
			fetchUsers();
		} catch (error) {
			console.error('Failed to delete user:', error);
			alert('Failed to delete user. Please try again.');
		}
	};

	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
		setCurrentPage(1);
	};

	const filteredUsers = users.filter((user) => {
		const searchMatch =
			user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.first_name.toLowerCase().includes(searchTerm.toLowerCase());
		const forceResetMatch = filterFlags.forceReset
			? user.reset_token_force_flag
			: true;
		const adminMatch = filterFlags.admin ? user.is_admin : true;
		return searchMatch && forceResetMatch && adminMatch;
	});

	const indexOfLastUser = currentPage * usersPerPage;
	const indexOfFirstUser = indexOfLastUser - usersPerPage;
	const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
	const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

	const handleFilterFlagChange = (e) => {
		const { name, checked } = e.target;
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
			name: 'forceReset',
			checked: filterFlags.forceReset,
			onChange: handleFilterFlagChange,
			md: 2,
		},
		{
			type: 'switch',
			label: 'Admin',
			name: 'admin',
			checked: filterFlags.admin,
			onChange: handleFilterFlagChange,
			md: 2,
		},
	];

	return (
		<div className='container mx-auto my-4'>
			<GenericFilterForm filters={filters} />
			<UsersTable
				currentUsers={currentUsers}
				onResetPassword={handleResetPassword}
				onDeleteUser={handleDeleteUser}
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
		</div>
	);
};

export default Users;
