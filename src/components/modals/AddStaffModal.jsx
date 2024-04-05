// AddStaffModal.js
import React, { useState } from 'react';
import { Modal, Tabs, Tab, Form, Button, Alert } from 'react-bootstrap';
import { StaffService } from '../../services/StaffService';

const AddStaffModal = ({
	show,
	handleClose,
	// fetchRescueProfile,
	rescueId,
	canAddStaff,
}) => {
	const [tabKey, setTabKey] = useState('newUser');
	const [newStaff, setNewStaff] = useState({
		firstName: '',
		email: '',
		password: '',
	});
	const [existingStaffEmail, setExistingStaffEmail] = useState('');

	const resetForms = () => {
		setNewStaff({ firstName: '', email: '', password: '' });
		setExistingStaffEmail('');
	};

	const handleAddStaff = async () => {
		console.log('Attempting to add staff member...', {
			tabKey,
			newStaff,
			existingStaffEmail,
		});
		try {
			if (tabKey === 'newUser') {
				console.log('Adding new staff member', newStaff);
				await StaffService.addStaffMember(rescueId, newStaff);
			} else {
				console.log('Adding existing staff member', existingStaffEmail);
				await StaffService.addStaffMember(rescueId, {
					email: existingStaffEmail,
				});
			}

			console.log('Staff member added successfully');
			// fetchRescueProfile();
			resetForms();
			handleClose();
		} catch (error) {
			console.error('Error adding staff member:', error);
			// Optionally, you can set an error message in the state and display it to the user
		}
	};

	return (
		<Modal show={show} onHide={handleClose} centered>
			<Modal.Header closeButton>
				<Modal.Title>Add Staff Member</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Tabs
					activeKey={tabKey}
					onSelect={(k) => setTabKey(k)}
					className='mb-3'
				>
					<Tab eventKey='newUser' title='New User'>
						<Form>
							<Form.Group className='mb-3'>
								<Form.Label>First Name</Form.Label>
								<Form.Control
									type='text'
									placeholder='First Name'
									value={newStaff.firstName}
									onChange={(e) =>
										setNewStaff({ ...newStaff, firstName: e.target.value })
									}
								/>
							</Form.Group>
							<Form.Group className='mb-3'>
								<Form.Label>Email</Form.Label>
								<Form.Control
									type='email'
									placeholder='Email'
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
					<Tab eventKey='existingUser' title='Existing User'>
						<Form>
							<Form.Group className='mb-3'>
								<Form.Label>Email</Form.Label>
								<Form.Control
									type='email'
									placeholder='Email'
									value={existingStaffEmail}
									onChange={(e) => setExistingStaffEmail(e.target.value)}
								/>
							</Form.Group>
						</Form>
					</Tab>
				</Tabs>
			</Modal.Body>
			<Modal.Footer>
				<Button variant='secondary' onClick={handleClose}>
					Close
				</Button>
				<Button
					variant='primary'
					onClick={handleAddStaff}
					disabled={!canAddStaff}
				>
					Add Staff
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export default AddStaffModal;