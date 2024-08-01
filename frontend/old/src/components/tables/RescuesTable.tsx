import React from 'react';
import { Rescue } from '../../types/rescue';
import PaginationControls from '../common/PaginationControls';

interface RescuesTableProps {
	rescues: Rescue[];
	onDeleteRescue: (id: string) => void;
	onShowDetails: (id: string) => void;
	currentPage: number;
	totalPages: number;
	onChangePage: (page: number) => void;
}

const RescuesTable: React.FC<RescuesTableProps> = ({
	rescues,
	onDeleteRescue,
	onShowDetails,
	currentPage,
	totalPages,
	onChangePage,
}) => {
	const handlePageChange = (newPage: number) => {
		onChangePage(newPage);
	};

	return (
		<div>
			<table className='min-w-full divide-y divide-gray-200'>
				<thead className='bg-gray-50'>
					<tr>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
							Rescue Name
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
							Rescue Type
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
							Actions
						</th>
					</tr>
				</thead>
				<tbody className='bg-white divide-y divide-gray-200'>
					{rescues.map((rescue) => (
						<tr key={rescue.rescue_id}>
							<td className='px-6 py-4 whitespace-nowrap'>
								{rescue.rescueName}
							</td>
							<td className='px-6 py-4 whitespace-nowrap'>
								{rescue.rescueType}
							</td>
							<td className='px-6 py-4 whitespace-nowrap'>
								<button
									onClick={() => onShowDetails(rescue.rescue_id)}
									className='text-indigo-600 hover:text-indigo-900'
								>
									Details
								</button>
								<button
									onClick={() => onDeleteRescue(rescue.rescue_id)}
									className='text-red-600 hover:text-red-900 ml-4'
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={onChangePage}
			/>
		</div>
	);
};

export default RescuesTable;
