import React from 'react';

const RescueProfileHeader = ({ rescueProfile }) => {
	return (
		<div className='my-4'>
			<h1 className='flex items-center space-x-2'>
				<span
					className={`px-2 py-1 rounded-full text-sm ${
						rescueProfile.referenceNumberVerified
							? 'bg-green-500 text-white'
							: 'bg-red-500 text-white'
					}`}
				>
					{rescueProfile.referenceNumberVerified ? 'Verified' : 'Un-verified'}
				</span>
				<span className='px-2 py-1 rounded-full text-sm bg-gray-200'>
					{rescueProfile.rescue_id}
				</span>
			</h1>
		</div>
	);
};

export default RescueProfileHeader;
