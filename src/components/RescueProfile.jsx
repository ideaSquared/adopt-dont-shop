import React, { useState, useEffect } from 'react';
import {
	Container,
	Form,
	Button,
	Badge,
	Table,
	InputGroup,
	Row,
	Col,
	Modal,
	Tabs,
	Tab,
} from 'react-bootstrap';
import axios from 'axios';
import AlertComponent from './AlertComponent';
import { useRescueRedirect } from './hooks/useRescueRedirect';
import { useAuth } from './AuthContext';
import PaginationControls from './PaginationControls';

const RescueProfile = () => {
	const [rescueProfile, setRescueProfile] = useState({
		id: '',
		staff: [],
		rescueName: '',
		rescueType: '',
		rescueAddress: '',
		referenceNumber: '',
		referenceNumberVerified: false,
	});
	const { userPermissions, isRescue } = useAuth();
	const userId = localStorage.getItem('userId');

	const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });
	const [showAddStaffModal, setShowAddStaffModal] = useState(false);
	const [newStaff, setNewStaff] = useState({
		firstName: '',
		email: '',
		password: '',
	});

	const [currentPage, setCurrentPage] = useState(1);
	const [staffPerPage] = useState(10);

	useRescueRedirect();

	useEffect(() => {
		if (isRescue) {
			fetchRescueProfile();
		}
	}, []);

	const fetchRescueProfile = async () => {
		try {
			// Assuming this URL is where you get your rescue profile data
			const response = await axios.get(
				`${import.meta.env.VITE_API_BASE_URL}/auth/my-rescue`,
				{
					withCredentials: true,
				}
			);

			setRescueProfile({
				...response.data,
				staff: response.data.staff || [],
			});
		} catch (error) {
			console.error('Error fetching rescue profile:', error);
		}
	};

	// Calculate unique permissions for table headers
	const uniquePermissions = Array.from(
		new Set(rescueProfile.staff.flatMap((staff) => staff.permissions))
	);

	const handlePermissionChange = async (staffId, permission, isChecked) => {
		// Update local state first for immediate feedback
		setRescueProfile((prevState) => {
			const updatedStaff = prevState.staff.map((staff) => {
				if (staff.userId === staffId) {
					const updatedPermissions = isChecked
						? [...staff.permissions, permission]
						: staff.permissions.filter((p) => p !== permission);

					return {
						...staff,
						permissions: updatedPermissions,
					};
				}
				return staff;
			});

			return {
				...prevState,
				staff: updatedStaff,
			};
		});

		// Prepare the data for updating the backend
		const updatedPermissions = rescueProfile.staff.find(
			(s) => s.userId._id === staffId
		).permissions;
		if (isChecked && !updatedPermissions.includes(permission)) {
			updatedPermissions.push(permission);
		} else if (!isChecked) {
			const index = updatedPermissions.indexOf(permission);
			if (index > -1) {
				updatedPermissions.splice(index, 1); // Remove permission if unchecked
			}
		}

		// Send an update request to the backend
		try {
			const response = await axios.put(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/${
					rescueProfile.id
				}/staff/${staffId}/permissions`,
				{
					permissions: updatedPermissions,
				},
				{
					withCredentials: true,
				}
			);
			// console.log('Permissions updated successfully:', response.data);
			// Optionally, you could fetch the updated rescue profile here to ensure the UI is fully in sync with the backend
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error updating staff permissions:',
				error.response?.data || error.message
			);
		}
	};

	const handleRescueInfoChange = (e) => {
		const { name, value } = e.target;
		setRescueProfile((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const verifyStaffMember = async (rescueId, staffId) => {
		try {
			const response = await axios.put(
				`${
					import.meta.env.VITE_API_BASE_URL
				}/rescue/${rescueId}/staff/${staffId}/verify`,
				{}, // PUT request does not need a body for this operation
				{ withCredentials: true }
			);

			// Reload or update the rescue profile to reflect the changes
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error verifying staff member:',
				error.response?.data || error.message
			);
		}
	};

	const removeStaffMember = async (rescueId, staffId) => {
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this staff member?'
		);
		if (!isConfirmed) {
			return; // Stop the function if the user cancels the action
		}

		try {
			const response = await axios.delete(
				`${
					import.meta.env.VITE_API_BASE_URL
				}/rescue/${rescueId}/staff/${staffId}`,
				{ withCredentials: true }
			);
			// Reload or update the rescue profile to reflect the changes
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error removing staff member:',
				error.response?.data || error.message
			);
		}
	};

	const updateRescueProfile = async (rescueId, updates) => {
		try {
			const response = await axios.put(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/${rescueId}`,
				updates,
				{ withCredentials: true }
			);
			// console.log('Rescue profile updated successfully:', response.data);
			// Optionally, refresh the local data to reflect the update
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error updating rescue profile:',
				error.response?.data || error.message
			);
		}
	};

	const handleReferenceNumberSubmit = async () => {
		alert('Test');
		if (!rescueProfile.referenceNumber) {
			setAlertInfo({
				type: 'danger',
				message: 'Please enter a reference number to submit for verification.',
			});
			return;
		}

		try {
			// Adjust the URL and request method according to your actual backend endpoint and its requirements
			const response = await axios.put(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/${
					rescueProfile.id
				}/${rescueProfile.rescueType.toLowerCase()}/validate`,
				{ referenceNumber: rescueProfile.referenceNumber.trim() }, // Or send as query params as per your API
				{ withCredentials: true }
			);

			if (response.data.data.referenceNumberVerified) {
				setAlertInfo({
					type: 'success',
					message: 'Reference number verified successfully.',
				});
				setRescueProfile((prev) => ({
					...prev,
					referenceNumberVerified: true,
				}));
			} else {
				setAlertInfo({
					type: 'danger',
					message: 'Failed to verify reference number.',
				});
				setRescueProfile((prev) => ({
					...prev,
					referenceNumberVerified: false,
				}));
			}
			fetchRescueProfile();
		} catch (error) {
			console.error(
				'Error submitting reference number for verification:',
				error
			);
			setAlertInfo({
				type: 'danger',
				message:
					'Error submitting reference number for verification. Please try again later.',
			});
		}
	};

	const handleAddStaff = async () => {
		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/${rescueProfile.id}/staff`,
				{
					firstName: newStaff.firstName,
					email: newStaff.email,
					password: newStaff.password,
				},
				{
					withCredentials: true,
				}
			);
			// console.log('Staff added successfully:', response.data);
			setShowAddStaffModal(false); // Close the modal on success
			fetchRescueProfile(); // Refresh the staff list
		} catch (error) {
			console.error(
				'Error adding new staff member:',
				error.response?.data || error.message
			);
		}
	};

	// Updated handleRemoveStaff to use the new API call
	const handleRemoveStaff = (staffId) => {
		removeStaffMember(rescueProfile.id, staffId);
	};

	// Assuming each staff member's verification status can be toggled with a button in your UI
	const handleVerifyStaff = (staffId) => {
		verifyStaffMember(rescueProfile.id, staffId);
	};

	const saveUpdates = () => {
		// Assuming `rescueProfile` contains the updated rescue profile data
		updateRescueProfile(rescueProfile.id, rescueProfile);
	};

	// Check for permissions
	const canEditRescueInfo = userPermissions.includes('edit_rescue_info');
	const canViewStaff = userPermissions.includes('view_staff');
	const canAddStaff = userPermissions.includes('add_staff');
	const canEditStaff = userPermissions.includes('edit_staff');
	const canVerifyStaff = userPermissions.includes('verify_staff');
	const canDeleteStaff = userPermissions.includes('delete_staff');

	const indexOfLastStaff = currentPage * staffPerPage;
	const indexOfFirstStaff = indexOfLastStaff - staffPerPage;
	const currentPets = rescueProfile.staff.slice(
		indexOfFirstStaff,
		indexOfLastStaff
	);
	const totalPages = Math.ceil(rescueProfile.staff.length / staffPerPage);

	return (
		<Container fluid>
			<h1>
				Rescue Profile{' '}
				<span style={{ verticalAlign: 'top' }}>
					<Badge
						bg={rescueProfile.referenceNumberVerified ? 'success' : 'danger'}
						style={{ fontSize: '16px' }}
					>
						{rescueProfile.referenceNumberVerified ? 'Verified' : 'Un-verified'}
					</Badge>
				</span>{' '}
				<span style={{ verticalAlign: 'top' }} bg='light'>
					<Badge style={{ fontSize: '16px' }}>{rescueProfile.id}</Badge>
				</span>
			</h1>

			{alertInfo.message && (
				<AlertComponent
					type={alertInfo.type}
					message={alertInfo.message}
					onClose={() => setAlertInfo({ type: '', message: '' })}
				/>
			)}

			<Form>
				<Row>
					{/* Rescue Name */}
					<Col md={4}>
						<Form.Group className='mb-3'>
							<Form.Label>Rescue Name</Form.Label>
							<Form.Control
								type='text'
								name='rescueName'
								value={rescueProfile.rescueName}
								onChange={handleRescueInfoChange}
								disabled={!canEditRescueInfo}
							/>
						</Form.Group>
					</Col>

					{/* Rescue Type */}
					<Col md={4}>
						<Form.Group className='mb-3'>
							<Form.Label>Rescue Type</Form.Label>
							<Form.Control
								type='text'
								name='rescueType'
								value={rescueProfile.rescueType}
								disabled={true}
							/>
						</Form.Group>
					</Col>

					{/* Reference Number */}
					<Col md={4}>
						<Form.Group className='mb-3'>
							<Form.Label>Reference Number</Form.Label>
							<InputGroup>
								<Form.Control
									type='text'
									placeholder='Enter reference number'
									aria-label='Reference Number'
									name='referenceNumber'
									value={rescueProfile.referenceNumber || ''}
									onChange={handleRescueInfoChange}
									disabled={!canEditRescueInfo}
								/>
								<Button
									variant='outline-secondary'
									id='button-addon2'
									onClick={handleReferenceNumberSubmit}
									disabled={!canEditRescueInfo}
								>
									Submit for verification
								</Button>
							</InputGroup>
						</Form.Group>
					</Col>
				</Row>

				{/* Rescue Address - As it's own section for clarity and spacing */}
				<Form.Group className='mb-3'>
					<Form.Label>Rescue Address</Form.Label>
					<Form.Control
						type='text'
						name='rescueAddress'
						value={rescueProfile.rescueAddress || ''}
						onChange={handleRescueInfoChange}
						disabled={!canEditRescueInfo}
					/>
				</Form.Group>
			</Form>

			<Button
				variant='primary'
				className='mt-3'
				onClick={saveUpdates}
				disabled={!canEditRescueInfo}
			>
				Save Changes
			</Button>

			<hr />

			{canViewStaff ? (
				<div>
					<h2>Staff Members</h2>
					<Button
						variant='primary'
						className='mb-3'
						onClick={() => setShowAddStaffModal(true)}
						disabled={!canAddStaff}
					>
						Add Staff
					</Button>
					<Table striped bordered hover>
						<thead>
							<tr>
								<th>Staff Email</th>
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
												Verify Staff
											</Button>
										)}
									</td>
									<td>
										<Button
											variant='danger'
											onClick={() => handleRemoveStaff(staff.userId._id)}
											disabled={!canDeleteStaff}
										>
											Remove Staff
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
										message={
											'This will create a new user who will need to login'
										}
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
				</div>
			) : null}
		</Container>
	);
};

export default RescueProfile;