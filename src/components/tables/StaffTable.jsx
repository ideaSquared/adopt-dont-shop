import React from 'react';

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
		<div>
			<table className='table-auto w-full border-collapse'>
				<thead>
					<tr>
						<th rowSpan='2' className='border px-4 py-2'>
							Staff Email
						</th>
						{Object.entries(permissionCategories).map(
							([category, permissions]) => (
								<th
									colSpan={permissions.length}
									key={category}
									className='border px-4 py-2'
								>
									{category.charAt(0).toUpperCase() +
										category.slice(1).replace(/([A-Z])/g, ' $1')}
								</th>
							)
						)}
						<th rowSpan='2' className='border px-4 py-2'>
							Actions
						</th>
					</tr>
					<tr>
						{Object.values(permissionCategories)
							.flat()
							.map((permission) => (
								<th key={permission} className='border px-4 py-2'>
									{permissionNames[permission]}
								</th>
							))}
					</tr>
				</thead>
				<tbody>
					{staff.map((staffMember) => (
						<tr key={staffMember.userId} className='hover:bg-gray-100'>
							<td className='border px-4 py-2'>{staffMember.email}</td>
							{Object.values(permissionCategories)
								.flat()
								.map((permission) => (
									<td
										key={`${staffMember.userId}-${permission}`}
										className='border px-4 py-2 text-center'
									>
										<input
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
											className='form-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
										/>
									</td>
								))}
							<td className='border px-4 py-2'>
								{staffMember.verifiedByRescue ? (
									<button
										className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
										disabled={true}
									>
										Verified
									</button>
								) : (
									<button
										className='bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded'
										onClick={() => verifyStaff(staffMember.userId)}
										disabled={!canEdit}
									>
										Verify
									</button>
								)}{' '}
								<button
									className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
									onClick={() => removeStaff(staffMember.userId)}
									disabled={!canEdit}
								>
									Remove
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default StaffTable;
