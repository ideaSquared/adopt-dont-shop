import React, { useState } from 'react';
import BaseSidebar from './BaseSidebar';
import { Rescue } from '../../types/rescue';

type RescueDetailsSidebarProps = {
	show: boolean;
	handleClose: () => void;
	rescueDetails: Rescue | null;
	onDeleteStaff: (rescueId: string, staffId: string) => void;
};

const RescueDetailsSidebar: React.FC<RescueDetailsSidebarProps> = ({
	show,
	handleClose,
	rescueDetails,
	onDeleteStaff,
}) => {
	const [visiblePermissions, setVisiblePermissions] = useState<{
		[key: string]: boolean;
	}>({});

	const togglePermissions = (userId: string) => {
		setVisiblePermissions((prev) => ({
			...prev,
			[userId]: !prev[userId],
		}));
	};

	return (
		<BaseSidebar
			show={show}
			handleClose={handleClose}
			title='Rescue Details'
			size='w-1/3'
		>
			{rescueDetails ? (
				<div>
					<h4 className='text-2xl font-semibold mb-4'>
						{rescueDetails.rescue_name}
					</h4>
					<p className='mb-2'>
						<b>Type:</b> {rescueDetails.rescue_type}
					</p>
					<p className='mb-2'>
						<b>City:</b> {rescueDetails.rescue_city}
					</p>
					<p className='mb-4'>
						<b>Country:</b> {rescueDetails.rescue_country}
					</p>
					<ul className='list-none'>
						{rescueDetails.staff.map((staffMember, index) => (
							<li key={index} className='border-b py-2'>
								<div className='flex justify-between items-center'>
									<span>{staffMember.email}</span>
									<div className='flex gap-2'>
										<button
											onClick={() => togglePermissions(staffMember.userId)}
											className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline'
										>
											{visiblePermissions[staffMember.userId]
												? 'Hide Permissions'
												: 'View Permissions'}
										</button>
										<button
											onClick={() =>
												onDeleteStaff(
													rescueDetails.rescue_id,
													staffMember.userId
												)
											}
											className='bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline'
										>
											Delete
										</button>
									</div>
								</div>
								{visiblePermissions[staffMember.userId] && (
									<div className='mt-2'>
										<h5 className='font-semibold'>Permissions:</h5>
										{staffMember.permissions &&
										staffMember.permissions.length > 0 ? (
											<ul className='list-disc list-inside ml-4'>
												{staffMember.permissions.map(
													(permission, permIndex) => (
														<li key={permIndex} className='text-gray-700'>
															{permission}
														</li>
													)
												)}
											</ul>
										) : (
											<p className='text-gray-700'>No permissions</p>
										)}
									</div>
								)}
							</li>
						))}
					</ul>
				</div>
			) : (
				<p>Loading details...</p>
			)}
		</BaseSidebar>
	);
};

export default RescueDetailsSidebar;
