import React, { useState } from 'react';
import { StaffService } from '../../services/StaffService';
import CustomModal from './CustomModal';

interface AddStaffModalProps {
	show: boolean;
	handleClose: () => void;
	setRescueProfile: (profile: any) => void;
	rescueId: string;
	canAddStaff: boolean;
}

interface StaffInfo {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
}

const AddStaffModal: React.FC<AddStaffModalProps> = ({
	show,
	handleClose,
	setRescueProfile,
	rescueId,
	canAddStaff,
}) => {
	const [tabKey, setTabKey] = useState<string>('newUser');
	const [newStaff, setNewStaff] = useState<StaffInfo>({
		firstName: '',
		lastName: '',
		email: '',
		password: '',
	});
	const [existingStaffEmail, setExistingStaffEmail] = useState<string>('');
	const [error, setError] = useState<string>('');

	const resetForms = () => {
		setNewStaff({ firstName: '', lastName: '', email: '', password: '' });
		setExistingStaffEmail('');
		setError('');
	};

	const handleAddStaff = async () => {
		try {
			let addedStaff;
			if (tabKey === 'newUser') {
				addedStaff = await StaffService.addStaffMember(rescueId, newStaff);
			} else {
				addedStaff = await StaffService.addStaffMember(rescueId, {
					firstName: '', // Provide default values for missing properties
					lastName: '', // Provide default values for missing properties
					password: '', // Provide default values for missing properties
					email: existingStaffEmail,
				});
			}

			setRescueProfile((prevState: any) => ({
				...prevState,
				staff: [...prevState.staff, addedStaff],
			}));
			resetForms();
			handleClose();
		} catch (error) {
			setError('Error adding staff member');
			console.error('Error adding staff member:', error);
		}
	};

	return (
		<CustomModal show={show} handleClose={handleClose}>
			<div className='mb-3'>
				<ul className='nav nav-tabs' role='tablist'>
					<li className='nav-item' role='presentation'>
						<button
							className={`nav-link ${tabKey === 'newUser' ? 'active' : ''}`}
							onClick={() => setTabKey('newUser')}
							id='newUser-tab'
							data-bs-toggle='tab'
							data-bs-target='#newUser'
							type='button'
							role='tab'
							aria-controls='newUser'
							aria-selected={tabKey === 'newUser' ? true : false}
						>
							New User
						</button>
					</li>
					<li className='nav-item' role='presentation'>
						<button
							className={`nav-link ${
								tabKey === 'existingUser' ? 'active' : ''
							}`}
							onClick={() => setTabKey('existingUser')}
							id='existingUser-tab'
							data-bs-toggle='tab'
							data-bs-target='#existingUser'
							type='button'
							role='tab'
							aria-controls='existingUser'
							aria-selected={tabKey === 'existingUser' ? true : false}
						>
							Existing User
						</button>
					</li>
				</ul>
				<div className='tab-content'>
					<div
						className={`tab-pane fade ${
							tabKey === 'newUser' ? 'show active' : ''
						}`}
						id='newUser'
						role='tabpanel'
						aria-labelledby='newUser-tab'
					>
						<form>
							<div className='mb-3'>
								<label htmlFor='firstName' className='form-label'>
									First name
								</label>
								<input
									type='text'
									id='firstName'
									className='form-control'
									placeholder='First name'
									value={newStaff.firstName}
									onChange={(e) =>
										setNewStaff({ ...newStaff, firstName: e.target.value })
									}
								/>
							</div>
							<div className='mb-3'>
								<label htmlFor='lastName' className='form-label'>
									Last name
								</label>
								<input
									type='text'
									id='lastName'
									className='form-control'
									placeholder='Last name'
									value={newStaff.lastName}
									onChange={(e) =>
										setNewStaff({ ...newStaff, lastName: e.target.value })
									}
								/>
							</div>
							<div className='mb-3'>
								<label htmlFor='email' className='form-label'>
									Email
								</label>
								<input
									type='email'
									id='email'
									className='form-control'
									placeholder='Email'
									value={newStaff.email}
									onChange={(e) =>
										setNewStaff({ ...newStaff, email: e.target.value })
									}
								/>
							</div>
							<div className='mb-3'>
								<label htmlFor='password' className='form-label'>
									Password
								</label>
								<input
									type='password'
									id='password'
									className='form-control'
									placeholder='Password'
									value={newStaff.password}
									onChange={(e) =>
										setNewStaff({ ...newStaff, password: e.target.value })
									}
								/>
							</div>
						</form>
					</div>
					<div
						className={`tab-pane fade ${
							tabKey === 'existingUser' ? 'show active' : ''
						}`}
						id='existingUser'
						role='tabpanel'
						aria-labelledby='existingUser-tab'
					>
						<form>
							<div className='mb-3'>
								<label htmlFor='existingEmail' className='form-label'>
									Email
								</label>
								<input
									type='email'
									id='existingEmail'
									className='form-control'
									placeholder='Email'
									value={existingStaffEmail}
									onChange={(e) => setExistingStaffEmail(e.target.value)}
								/>
							</div>
						</form>
					</div>
				</div>
			</div>
		</CustomModal>
	);
};

export default AddStaffModal;
