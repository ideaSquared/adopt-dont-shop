import React, { useState } from 'react';
import { StaffService } from '../../services/StaffService';
import BaseSidebar from './BaseSidebar';

type AddStaffSidebarProps = {
	show: boolean;
	handleClose: () => void;
	setRescueProfile: React.Dispatch<React.SetStateAction<any>>;
	rescueId: string;
	canAddStaff: boolean;
};

type NewStaff = {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
};

type ExistingStaff = {
	email: string;
};

const AddStaffSidebar: React.FC<AddStaffSidebarProps> = ({
	show,
	handleClose,
	setRescueProfile,
	rescueId,
	canAddStaff,
}) => {
	const [tabKey, setTabKey] = useState<'newUser' | 'existingUser'>('newUser');
	const [newStaff, setNewStaff] = useState<NewStaff>({
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
				const existingStaff = { 
					firstName: '', 
					lastName: '', 
					email: existingStaffEmail, 
					password: '' 
				};
				addedStaff = await StaffService.addStaffMember(rescueId, existingStaff);
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
		<BaseSidebar show={show} handleClose={handleClose} title='Add Staff'>
			<div className='mb-3'>
				<div className='flex mb-4'>
					<button
						className={`flex-1 py-2 text-center ${
							tabKey === 'newUser' ? 'bg-indigo-500 text-white' : 'bg-gray-200'
						} rounded-l-md`}
						onClick={() => setTabKey('newUser')}
					>
						New User
					</button>
					<button
						className={`flex-1 py-2 text-center ${
							tabKey === 'existingUser' ? 'bg-indigo-500 text-white' : 'bg-gray-200'
						} rounded-r-md`}
						onClick={() => setTabKey('existingUser')}
					>
						Existing User
					</button>
				</div>

				{tabKey === 'newUser' ? (
					<form className='space-y-6'>
						<div>
							<label
								htmlFor='firstName'
								className='block text-sm font-medium text-gray-700'
							>
								First name
							</label>
							<input
								type='text'
								id='firstName'
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
								placeholder='First name'
								value={newStaff.firstName}
								onChange={(e) =>
									setNewStaff({ ...newStaff, firstName: e.target.value })
								}
							/>
						</div>
						<div>
							<label
								htmlFor='lastName'
								className='block text-sm font-medium text-gray-700'
							>
								Last name
							</label>
							<input
								type='text'
								id='lastName'
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
								placeholder='Last name'
								value={newStaff.lastName}
								onChange={(e) =>
									setNewStaff({ ...newStaff, lastName: e.target.value })
								}
							/>
						</div>
						<div>
							<label
								htmlFor='email'
								className='block text-sm font-medium text-gray-700'
							>
								Email
							</label>
							<input
								type='email'
								id='email'
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
								placeholder='Email'
								value={newStaff.email}
								onChange={(e) =>
									setNewStaff({ ...newStaff, email: e.target.value })
								}
							/>
						</div>
						<div>
							<label
								htmlFor='password'
								className='block text-sm font-medium text-gray-700'
							>
								Password
							</label>
							<input
								type='password'
								id='password'
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
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
								className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
							>
								Add staff
							</button>
						</div>
					</form>
				) : (
					<form className='space-y-6'>
						<div>
							<label
								htmlFor='existingEmail'
								className='block text-sm font-medium text-gray-700'
							>
								Email
							</label>
							<input
								type='email'
								id='existingEmail'
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
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
								className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
							>
								Add staff
							</button>
						</div>
					</form>
				)}

				{error && <div className='text-red-500'>{error}</div>}
			</div>
		</BaseSidebar>
	);
};

export default AddStaffSidebar;
