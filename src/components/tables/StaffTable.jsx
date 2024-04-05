import React from 'react';
import { Table, Button, Form } from 'react-bootstrap';

const StaffTable = ({
	staff,
	verifyStaff,
	removeStaff,
	updatePermissions,
	canEdit,
	permissionCategories,
	permissionNames,
	userId,
}) => {
	return (
		<Table striped bordered hover responsive>
			<thead>
				<tr>
					<th rowSpan='2'>Staff Email</th>
					{Object.entries(permissionCategories).map(
						([category, permissions]) => (
							<th colSpan={permissions.length} key={category}>
								{category.charAt(0).toUpperCase() +
									category.slice(1).replace(/([A-Z])/g, ' $1')}
							</th>
						)
					)}
					<th rowSpan='2'>Actions</th>
				</tr>
				<tr>
					{Object.values(permissionCategories)
						.flat()
						.map((permission) => (
							<th key={permission}>{permissionNames[permission]}</th>
						))}
				</tr>
			</thead>
			<tbody>
				{staff.map((staffMember) => (
					<tr key={staffMember.userId._id}>
						<td>{staffMember.userId.email}</td>
						{Object.values(permissionCategories)
							.flat()
							.map((permission) => (
								<td key={`${staffMember.userId._id}-${permission}`}>
									<Form.Check
										type='checkbox'
										checked={staffMember.permissions.includes(permission)}
										onChange={(e) =>
											updatePermissions(
												staffMember.userId._id,
												permission,
												e.target.checked
											)
										}
										disabled={staffMember.userId._id === userId || !canEdit}
									/>
								</td>
							))}
						<td>
							{staffMember.verifiedByRescue ? (
								<Button variant='info' disabled={true}>
									Verified
								</Button>
							) : (
								<Button
									variant='warning'
									onClick={() => verifyStaff(staffMember.userId._id)}
									disabled={!canEdit}
								>
									Verify
								</Button>
							)}{' '}
							<Button
								variant='danger'
								onClick={() => removeStaff(staffMember.userId._id)}
								disabled={!canEdit}
							>
								Remove
							</Button>
						</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default StaffTable;
