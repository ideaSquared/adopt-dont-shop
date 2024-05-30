import React from 'react';
import CustomModal from './CustomModal';

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

	const getPermissionName = (permission) => {
		return permissionNames[permission] || 'Unknown Permission';
	};

	const staffHasPermission = (staffPermissions, permission) => {
		return staffPermissions.includes(permission);
	};

	return (
		<CustomModal show={showModal} handleClose={handleClose}>
			{rescueDetails ? (
				<div className='p-4'>
					<h2 className='text-lg font-semibold mb-4'>Rescue Details</h2>
					<form>
						<div className='mb-4'>
							<label htmlFor='rescue_name' className='block mb-1'>
								Rescue name
							</label>
							<input
								id='rescue_name'
								type='text'
								value={rescueDetails.rescue_name}
								disabled
								className='w-full px-4 py-2 rounded-md border focus:outline-none'
							/>
						</div>
						<div className='mb-4'>
							<label htmlFor='rescue_type' className='block mb-1'>
								Type
							</label>
							<input
								id='rescue_type'
								type='text'
								value={rescueDetails.rescue_type}
								disabled
								className='w-full px-4 py-2 rounded-md border focus:outline-none'
							/>
						</div>
						<div className='mb-4'>
							<label htmlFor='rescue_address' className='block mb-1'>
								Rescue address
							</label>
							<textarea
								id='rescue_address'
								rows={4}
								value={`${rescueDetails.rescue_address_line_1}\n${rescueDetails.rescue_address_line_2}\n${rescueDetails.rescue_city}\n${rescueDetails.rescue_county}\n${rescueDetails.rescue_postcode}\n${rescueDetails.rescue_country}`}
								disabled
								className='w-full px-4 py-2 rounded-md border focus:outline-none'
							/>
						</div>
						<hr className='my-4' />
						<div className='space-y-4'>
							{rescueDetails.staff.map((staffMember, index) => (
								<div key={staffMember.userId}>
									<h3 className='text-lg font-semibold'>
										Staff details for {staffMember.email}
									</h3>
									<div className='flex justify-between items-center mb-3'>
										<h5>Full details</h5>
										<button
											className='text-red-500 hover:text-red-700 focus:outline-none'
											onClick={() => onDeleteStaff(staffMember.userId)}
										>
											Remove staff member
										</button>
									</div>
									<div className='mb-3'>
										<label htmlFor={`email-${index}`} className='block mb-1'>
											Email
										</label>
										<input
											id={`email-${index}`}
											type='email'
											defaultValue={staffMember.email}
											readOnly
											className='w-full px-4 py-2 rounded-md border focus:outline-none'
										/>
									</div>
									<div className='mb-3'>
										<Tabs defaultActiveKey='permissions' className='mb-3'>
											{Object.entries(permissionCategories).map(
												([category, permissions]) => (
													<Tab
														eventKey={category}
														title={category.replace(/([A-Z])/g, ' $1').trim()}
														key={category}
													>
														{permissions.map((permission, permIndex) =>
															staffHasPermission(
																staffMember.permissions,
																permission
															) ? (
																<div
																	key={permIndex}
																	className='mb-3 flex items-center'
																>
																	<input
																		type='checkbox'
																		className='form-checkbox mr-2'
																		checked
																		disabled
																	/>
																	<label>{getPermissionName(permission)}</label>
																</div>
															) : null
														)}
													</Tab>
												)
											)}
										</Tabs>
									</div>
								</div>
							))}
						</div>
					</form>
				</div>
			) : (
				<p>Loading details...</p>
			)}
		</CustomModal>
	);
};

export default RescueDetailsModal;
