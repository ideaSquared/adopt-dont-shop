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
							<td>{user.email}</td>
							<td>
								{user.resetTokenForceFlag && (
									<StatusBadge type='misc' value='Force Reset Flag' />
								)}
								{user.isAdmin && <StatusBadge type='misc' value='Admin' />}
							</td>
							<td>
								<Button
									variant='warning'
									onClick={() => onResetPassword(user._id)}
									className='me-2'
								>
									Reset Password
								</Button>
								<Button variant='danger' onClick={() => onDeleteUser(user._id)}>
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
