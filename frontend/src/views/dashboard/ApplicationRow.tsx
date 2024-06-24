import React from 'react';
import { Application } from '../../services/ApplicationsService';

interface ApplicationRowProps {
	application: ApplicationRowPropsApplication;
	onViewApplication: (application: Application) => void;
	onApprove: (id: string) => Promise<void>;
	onReject: (id: string) => Promise<void>;
}

interface ApplicationRowPropsApplication extends Application {
	actioned_by_name: string;
}

const ApplicationRow: React.FC<ApplicationRowProps> = ({
	application,
	onViewApplication,
	onApprove,
	onReject,
}) => {
	return (
		<tr className='hover:bg-gray-100'>
			<td className='border px-4 py-2'>{application.first_name}</td>
			<td className='border px-4 py-2'>{application.pet_name}</td>
			<td className='border px-4 py-2'>{application.description}</td>
			<td className='border px-4 py-2'>{application.status}</td>
			<td className='border px-4 py-2'>{application.actioned_by_name}</td>
			<td className='border px-4 py-2'>
				<button
					onClick={() => onViewApplication(application)}
					className='bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded mr-2'
				>
					View
				</button>
				{application.status === 'pending' && (
					<>
						<button
							onClick={() => onApprove(application.application_id)}
							className='bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded mr-2'
						>
							Approve
						</button>
						<button
							onClick={() => onReject(application.application_id)}
							className='bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded'
						>
							Reject
						</button>
					</>
				)}
			</td>
		</tr>
	);
};

export default ApplicationRow;
