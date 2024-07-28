// frontend/new/src/pages/Users.tsx
import React from 'react';
import { UserService } from '@lib/users';

const Users: React.FC = () => {
	const users = UserService.getUsers();

	return (
		<div>
			<h1>Users</h1>
			<ul>
				{users.map((user) => (
					<li key={user.user_id}>{user.email}</li>
				))}
			</ul>
		</div>
	);
};

export default Users;
