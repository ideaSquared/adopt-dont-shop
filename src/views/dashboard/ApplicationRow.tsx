import React from 'react';
import { Application } from '../../services/ApplicationsService';

interface ApplicationRowProps {
	application: Application;
	onViewApplication: (application: Application) => void;
}

const ApplicationRow: React.FC<ApplicationRowProps> = ({
	application,
	onViewApplication,
}) => {
	return (
		<tr>
			<td className='border px-4 py-2'>{application.first_name}</td>
			<td className='border px-4 py-2'>{application.pet_name}</td>
			<td className='border px-4 py-2'>{application.description}</td>
			<td className='border px-4 py-2'>{application.status}</td>
			<td className='border px-4 py-2'>{application.actioned_by}</td>
			<td className='border px-4 py-2'>
				<button
					onClick={() => onViewApplication(application)}
					className='bg-blue-500 text-white py-2 px-4 rounded'
				>
					View
				</button>
			</td>
		</tr>
	);
};

export default ApplicationRow;
