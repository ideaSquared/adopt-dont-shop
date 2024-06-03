import React, { useState } from 'react';
import { Rescue as RescueDetailsType } from '../../types/rescue';

interface RescueDetailsProps {
	details: RescueDetailsType;
	onUpdateDetails: (updatedDetails: RescueDetailsType) => void;
}

const RescueDetails: React.FC<RescueDetailsProps> = ({
	details,
	onUpdateDetails,
}) => {
	const [rescueName, setRescueName] = useState(details.rescue_name);
	const [rescueType, setRescueType] = useState(details.rescue_type);
	const [rescueCity, setRescueCity] = useState(details.rescue_city);
	const [rescueCountry, setRescueCountry] = useState(details.rescue_country);
	const [referenceNumber, setReferenceNumber] = useState(
		details.referenceNumber || ''
	);

	const handleSave = () => {
		onUpdateDetails({
			...details,
			rescue_name: rescueName,
			rescue_type: rescueType,
			rescue_city: rescueCity,
			rescue_country: rescueCountry,
			referenceNumber,
		});
	};

	return (
		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-gray-700'>
					Rescue Name
				</label>
				<input
					type='text'
					value={rescueName}
					onChange={(e) => setRescueName(e.target.value)}
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
				/>
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700'>
					Rescue Type
				</label>
				<input
					type='text'
					value={rescueType}
					onChange={(e) => setRescueType(e.target.value)}
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
				/>
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700'>
					Rescue City
				</label>
				<input
					type='text'
					value={rescueCity}
					onChange={(e) => setRescueCity(e.target.value)}
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
				/>
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700'>
					Rescue Country
				</label>
				<input
					type='text'
					value={rescueCountry}
					onChange={(e) => setRescueCountry(e.target.value)}
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
				/>
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700'>
					Reference Number
				</label>
				<input
					type='text'
					value={referenceNumber}
					onChange={(e) => setReferenceNumber(e.target.value)}
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
				/>
			</div>
			<button
				onClick={handleSave}
				className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
			>
				Save
			</button>
		</div>
	);
};

export default RescueDetails;
