import React from 'react';
import { Table, Button, Modal, Tabs, Tab, Form } from 'react-bootstrap';
import PaginationControls from './PaginationControls';
import AlertComponent from './AlertComponent';

const RescueStaffManagement = ({
	rescueProfile,
	currentPage,
	totalPages,
	canAddStaff,
	canEditStaff,
	canVerifyStaff,
	canDeleteStaff,
	showAddStaffModal,
	setShowAddStaffModal,
	uniquePermissions,
	setCurrentPage,
	newStaff,
	setNewStaff,
	handleAddStaff,
	handleRemoveStaff,
	handleVerifyStaff,
	handlePermissionChange,
	userId,
}) => {
	return (
		<>
			<h2>Staff members</h2>
			<Button
				variant='primary'
				className='mb-3'
				onClick={() => setShowAddStaffModal(true)}
				disabled={!canAddStaff}
			>
				Add staff
			</Button>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>Staff email</th>
						{uniquePermissions.map((permission, index) => (
							<th key={index}>{permission}</th>
						))}
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{rescueProfile.staff.map((staff) => (
						<tr key={staff.userId._id}>
							<td>{staff.userId.email}</td>
							{uniquePermissions.map((permission) => (
								<td key={`${staff.userId._id}-${permission}`}>
									<Form.Check
										type='checkbox'
										checked={staff.permissions.includes(permission)}
										onChange={(e) =>
											handlePermissionChange(
												staff.userId._id,
												permission,
												e.target.checked
											)
										}
										disabled={staff.userId._id === userId || !canEditStaff} // Disable if this staff is the current user
									/>
								</td>
							))}

							<td>
								{staff.verifiedByRescue ? (
									<Button variant='info' disabled={true}>
										Verified
									</Button>
								) : (
									<Button
										variant='warning'
										onClick={() => handleVerifyStaff(staff.userId._id)}
										disabled={!canVerifyStaff}
									>
										Verify staff
									</Button>
								)}
							</td>
							<td>
								<Button
									variant='danger'
									onClick={() => handleRemoveStaff(staff.userId._id)}
									disabled={!canDeleteStaff}
								>
									Remove staff
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
			<Modal
				show={showAddStaffModal}
				onHide={() => setShowAddStaffModal(false)}
			>
				<Modal.Header closeButton>
					<Modal.Title>Add New Staff Member</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Tabs defaultActiveKey='newUser' id='addUserTab'>
						<Tab eventKey='newUser' title='Add a New User'>
							<AlertComponent
								type={'info'}
								message={'This will create a new user who will need to login'}
								hideCloseButton={true}
							/>
							<Form>
								<Form.Group className='mb-3'>
									<Form.Label>First name</Form.Label>
									<Form.Control
										type='text'
										placeholder='Enter first name'
										value={newStaff.firstName}
										onChange={(e) =>
											setNewStaff({
												...newStaff,
												firstName: e.target.value,
											})
										}
									/>
								</Form.Group>
								<Form.Group className='mb-3'>
									<Form.Label>Email address</Form.Label>
									<Form.Control
										type='email'
										placeholder='Enter email'
										value={newStaff.email}
										onChange={(e) =>
											setNewStaff({ ...newStaff, email: e.target.value })
										}
									/>
								</Form.Group>
								<Form.Group className='mb-3'>
									<Form.Label>Password</Form.Label>
									<Form.Control
										type='password'
										placeholder='Password'
										value={newStaff.password}
										onChange={(e) =>
											setNewStaff({ ...newStaff, password: e.target.value })
										}
									/>
								</Form.Group>
							</Form>
						</Tab>
						<Tab eventKey='existingUser' title='Add an Existing User'>
							<AlertComponent
								type={'info'}
								message={'This will add an already signed up user as staff'}
								hideCloseButton={true}
							/>
							<Form>
								<Form.Group className='mb-3'>
									<Form.Label>Email address</Form.Label>
									<Form.Control
										type='email'
										placeholder='Enter existing user email'
									/>
								</Form.Group>
							</Form>
						</Tab>
					</Tabs>
				</Modal.Body>
				<Modal.Footer>
					<Button
						variant='secondary'
						onClick={() => setShowAddStaffModal(false)}
					>
						Close
					</Button>
					<Button
						variant='primary'
						onClick={handleAddStaff}
						disabled={!canAddStaff}
					>
						Add staff
					</Button>
				</Modal.Footer>
			</Modal>
		</>
	);
};

export default RescueStaffManagement;
