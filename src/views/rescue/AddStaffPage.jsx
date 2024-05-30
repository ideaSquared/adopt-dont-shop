import React, { useState } from 'react';
import { StaffService } from '../../services/StaffService';
import { useNavigate } from 'react-router-dom'; // Import for navigation

const AddStaffPage = ({ setRescueProfile, rescueId, canAddStaff }) => {
	const [tabKey, setTabKey] = useState('newUser');
	const [newStaff, setNewStaff] = useState({
		firstName: '',
		lastName: '',
		email: '',
		password: '',
	});
	const [existingStaffEmail, setExistingStaffEmail] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate(); // Use navigate hook

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
					email: existingStaffEmail,
				});
			}

			setRescueProfile((prevState) => ({
				...prevState,
				staff: [...prevState.staff, addedStaff],
			}));
			resetForms();
			navigate('/rescue-profile'); // Navigate to rescue profile page after adding staff
		} catch (error) {
			setError('Error adding staff member');
			console.error('Error adding staff member:', error);
		}
	};

	return (
		<div className='container mx-auto px-4 py-6'>
			<h2 className='text-2xl font-semibold mb-4'>Add Staff</h2>
			<div className='mb-3'>
				<ul className='nav nav-tabs' role='tablist'>
					<li className='nav-item' role='presentation'>
						<button
							className={`nav-link ${tabKey === 'newUser' ? 'active' : ''}`}
							onClick={() => setTabKey('newUser')}
							id='newUser-tab'
							type='button'
							role='tab'
							aria-controls='newUser'
							aria-selected={tabKey === 'newUser' ? 'true' : 'false'}
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
							type='button'
							role='tab'
							aria-controls='existingUser'
							aria-selected={tabKey === 'existingUser' ? 'true' : 'false'}
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
							<div className='flex justify-end'>
								<button
									type='button'
									onClick={handleAddStaff}
									disabled={!canAddStaff}
									className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
								>
									Add Staff
								</button>
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
							<div className='flex justify-end'>
								<button
									type='button'
									onClick={handleAddStaff}
									disabled={!canAddStaff}
									className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
								>
									Add Staff
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
			{error && <div className='text-red-500'>{error}</div>}
		</div>
	);
};

export default AddStaffPage;
