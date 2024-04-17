import React from 'react';
import { Table, Button } from 'react-bootstrap';
import PaginationControls from '../common/PaginationControls';
import StatusBadge from '../common/StatusBadge';

const UsersTable = ({
	currentUsers,
	onResetPassword,
	onDeleteUser,
	currentPage,
	totalPages,
	onChangePage,
}) => {
	return (
		<>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>User ID</th>
						<th>First name</th>
						<th>Last name</th>
						<th>Email</th>
						<th>City</th>
						<th>Country</th>
						<th>Flags</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{currentUsers.map((user) => (
						<tr key={user.user_id}>
							<td>{user.user_id}</td>
							<td>{user.first_name}</td>
							<td>{user.last_name}</td>
							<td>{user.email}</td>
							<td>{user.city || ''}</td>
							<td>{user.country || ''}</td>
							<td>
								{user.reset_token_force_flag && (
									<StatusBadge type='misc' value='Force Reset Flag' />
								)}
								{user.is_admin && <StatusBadge type='misc' value='Admin' />}
							</td>
							<td>
								<Button
									variant='warning'
									onClick={() => onResetPassword(user.user_id)}
									className='me-2'
								>
									Reset Password
								</Button>
								<Button
									variant='danger'
									onClick={() => onDeleteUser(user.user_id)}
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
				onChangePage={onChangePage}
			/>
		</>
	);
};

export default UsersTable;
