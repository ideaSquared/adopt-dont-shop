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
					<tr key={staffMember.userId}>
						<td>{staffMember.email}</td>
						{Object.values(permissionCategories)
							.flat()
							.map((permission) => (
								<td key={`${staffMember.userId}-${permission}`}>
									<Form.Check
										type='checkbox'
										checked={
											staffMember.permissions
												? staffMember.permissions.includes(permission)
												: false
										}
										onChange={(e) =>
											updatePermissions(
												staffMember.userId,
												permission,
												e.target.checked
											)
										}
										disabled={staffMember.userId === userId || !canEdit}
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
									onClick={() => verifyStaff(staffMember.userId)}
									disabled={!canEdit}
								>
									Verify
								</Button>
							)}{' '}
							<Button
								variant='danger'
								onClick={() => removeStaff(staffMember.userId)}
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
