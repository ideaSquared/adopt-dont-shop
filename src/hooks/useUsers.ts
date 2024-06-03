import { useState, useEffect, ChangeEvent } from 'react';
import UserService from '../services/UserService';
import { User } from '../types/user';

interface FilterFlags {
	forceReset: boolean;
	admin: boolean;
}

export const useUsers = () => {
	const [users, setUsers] = useState<User[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [usersPerPage] = useState(10);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterFlags, setFilterFlags] = useState<FilterFlags>({
		forceReset: false,
		admin: false,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async () => {
		setIsLoading(true);
		try {
			const data = await UserService.fetchAdminUsers();
			setUsers(data || []);
			setIsLoading(false);
		} catch (error) {
			setError('Failed to fetch users.');
			setIsLoading(false);
		}
	};

	const handleResetPassword = async (userId: string) => {
		try {
			await UserService.resetAdminUserPassword(userId);
			alert('Password reset successfully.');
		} catch (error) {
			alert('Failed to reset password. Please try again.');
		}
	};

	const handleDeleteUser = async (userId: string) => {
		try {
			await UserService.deleteAdminUser(userId);
			fetchUsers();
		} catch (error) {
			alert('Failed to delete user. Please try again.');
		}
	};

	const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
		setCurrentPage(1);
	};

	const handleFilterFlagChange = (e: ChangeEvent<HTMLInputElement>) => {
		const { name, checked } = e.target;
		setFilterFlags((prevFlags) => ({
			...prevFlags,
			[name]: checked,
		}));
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

	return {
		users: currentUsers,
		currentPage,
		totalPages,
		searchTerm,
		filterFlags,
		isLoading,
		error,
		handleSearchChange,
		handleFilterFlagChange,
		handleResetPassword,
		handleDeleteUser,
		setCurrentPage,
	};
};
