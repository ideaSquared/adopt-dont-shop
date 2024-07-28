import { User } from './User';

const users: User[] = [
	{
		user_id: '1',
		first_name: 'John ',
		last_name: 'Doe',
		email: 'john@example.com',
	},
	{
		user_id: '2',
		first_name: 'Jane ',
		last_name: 'Doe',
		email: 'jane@example.com',
	},
];

const getUsers = (): User[] => users;

const getUserById = (id: string): User | undefined =>
	users.find((user) => user.user_id === id);

export default {
	getUsers,
	getUserById,
};
