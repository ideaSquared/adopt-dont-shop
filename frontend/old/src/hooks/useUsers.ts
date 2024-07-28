import { useState, useEffect, ChangeEvent } from 'react';
import UserService from '../services/UserService';
import { User } from '../types/user';

interface FilterFlags {
	forceReset: boolean;
	admin: boolean;
}

export const useUsers = () => {
	const [users, setUsers] = useState<User[]>([]);
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
			setUsers((prevUsers) =>
				prevUsers.map((user) =>
					user.user_id === userId
						? { ...user, reset_token_force_flag: true }
						: user
				)
			);
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

	return {
		users: filteredUsers,
		searchTerm,
		filterFlags,
		isLoading,
		error,
		handleSearchChange,
		handleFilterFlagChange,
		handleResetPassword,
		handleDeleteUser,
	};
};
