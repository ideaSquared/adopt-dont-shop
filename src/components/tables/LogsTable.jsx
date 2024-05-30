import React from 'react';
import PaginationControls from '../common/PaginationControls';
import StatusBadge from '../common/StatusBadge';

const LogsTable = ({
	currentLogs,
	currentPage,
	totalPages,
	setCurrentPage,
}) => {
	return (
		<div>
			<table className='table-auto w-full'>
				<thead>
					<tr>
						<th className='border px-4 py-2'>Timestamp</th>
						<th className='border px-4 py-2'>Level</th>
						<th className='border px-4 py-2'>Service</th>
						<th className='border px-4 py-2'>Message</th>
					</tr>
				</thead>
				<tbody>
					{currentLogs.map((log) => (
						<tr key={log._id} className='hover:bg-gray-100'>
							<td className='border px-4 py-2'>
								{new Date(log.timestamp).toLocaleString()}
							</td>
							<td className='border px-4 py-2'>
								<StatusBadge type='loglevel' value={log.level} />
							</td>
							<td className='border px-4 py-2'>
								<StatusBadge type='logservice' value={log.service} />
							</td>
							<td className='border px-4 py-2'>{log.message}</td>
						</tr>
					))}
				</tbody>
			</table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
		</div>
	);
};

export default LogsTable;
