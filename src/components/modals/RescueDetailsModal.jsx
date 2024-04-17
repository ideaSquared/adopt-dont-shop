import React from 'react';
import {
	Modal,
	Button,
	Form,
	Col,
	Row,
	Accordion,
	Tab,
	Tabs,
} from 'react-bootstrap';

const RescueDetailsModal = ({ showModal, handleClose, rescueDetails }) => {
	const permissionCategories = {
		RescueOperations: ['view_rescue_info', 'edit_rescue_info', 'delete_rescue'],
		StaffManagement: [
			'view_staff',
			'add_staff',
			'edit_staff',
			'verify_staff',
			'delete_staff',
		],
		PetManagement: ['view_pet', 'add_pet', 'edit_pet', 'delete_pet'],
		Communications: ['create_messages', 'view_messages'],
	};

	const permissionNames = {
		view_rescue_info: 'View Rescue Information',
		edit_rescue_info: 'Edit Rescue Information',
		delete_rescue: 'Delete Rescue',
		view_staff: 'View Staff',
		add_staff: 'Add Staff',
		edit_staff: 'Edit Staff Information',
		verify_staff: 'Verify Staff',
		delete_staff: 'Delete Staff',
		view_pet: 'View Pet',
		add_pet: 'Add Pet',
		edit_pet: 'Edit Pet Information',
		delete_pet: 'Delete Pet',
		create_messages: 'Create Messages',
		view_messages: 'View Messages',
	};

	// Function to get the name of the permission
	const getPermissionName = (permission) => {
		return permissionNames[permission] || 'Unknown Permission';
	};

	// Function to check if staff has a specific permission
	const staffHasPermission = (staffPermissions, permission) => {
		return staffPermissions.includes(permission);
	};

	return (
		<Modal show={showModal} onHide={handleClose} size='lg'>
			<Modal.Header closeButton>
				<Modal.Title>Rescue Details</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				{rescueDetails ? (
					<Form>
						<Form.Group controlId='rescue_name'>
							<Form.Label>Rescue name</Form.Label>
							<Form.Control
								type='text'
								value={rescueDetails.rescue_name}
								disabled
							/>
						</Form.Group>
						<Form.Group controlId='rescue_type'>
							<Form.Label>Type</Form.Label>
							<Form.Control
								type='text'
								value={rescueDetails.rescue_type}
								disabled
							/>
						</Form.Group>

						<Form.Group controlId='rescue_address'>
							<Form.Label>Rescue address</Form.Label>
							<Form.Control
								as='textarea'
								rows={4}
								value={
									rescueDetails.rescue_address_line_1 +
									'\n' +
									rescueDetails.rescue_address_line_2 +
									'\n' +
									rescueDetails.rescue_city +
									'\n' +
									rescueDetails.rescue_county +
									'\n' +
									rescueDetails.rescue_postcode +
									'\n' +
									rescueDetails.rescue_country
								}
								disabled
							/>
						</Form.Group>
						{/* EACH STAFF MEMBER */}
						<hr />
						<Accordion defaultActiveKey='0'>
							{rescueDetails.staff.map((staffMember, index) => (
								<Accordion.Item
									eventKey={index.toString()}
									key={staffMember.userId}
								>
									<Accordion.Header>
										Staff details for {staffMember.email}
									</Accordion.Header>
									<Accordion.Body>
										<div className='d-flex justify-content-between align-items-center mb-3'>
											<h5>Full details</h5>
											<Button
												variant='danger'
												onClick={() => onDeleteStaff(staffMember.userId)}
											>
												Remove staff member
											</Button>
										</div>
										<Form.Group as={Row} className='mb-3'>
											<Form.Label column sm='2'>
												Email
											</Form.Label>
											<Col sm='10'>
												<Form.Control
													type='email'
													defaultValue={staffMember.email}
													readOnly
												/>
											</Col>
										</Form.Group>

										<Tabs
											defaultActiveKey='permissions'
											id={`staff-${staffMember.userId}-tabs`}
											className='mb-3'
										>
											{Object.entries(permissionCategories).map(
												([category, permissions]) => (
													<Tab
														eventKey={category}
														title={category.replace(/([A-Z])/g, ' $1').trim()}
														key={category}
													>
														{permissions.map(
															(permission, permIndex) =>
																staffHasPermission(
																	staffMember.permissions,
																	permission
																) && (
																	<Form.Group
																		as={Row}
																		key={permIndex}
																		className='mb-3'
																	>
																		<Col sm={{ span: 10, offset: 2 }}>
																			<Form.Check
																				type='checkbox'
																				label={getPermissionName(permission)}
																				checked
																				disabled
																			/>
																		</Col>
																	</Form.Group>
																)
														)}
													</Tab>
												)
											)}
										</Tabs>
									</Accordion.Body>
								</Accordion.Item>
							))}
						</Accordion>
					</Form>
				) : (
					<p>Loading details...</p>
				)}
			</Modal.Body>
			<Modal.Footer>
				<Button variant='secondary' onClick={handleClose}>
					Close
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export default RescueDetailsModal;
