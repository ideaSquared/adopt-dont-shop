import React from 'react';
import PaginationControls from '../common/PaginationControls';
import StatusBadge from '../common/StatusBadge';
import { useLogs } from '../../hooks/useLogs';

const LogsTable: React.FC = () => {
	const { logs, currentPage, totalPages, isLoading, error, setCurrentPage } =
		useLogs();

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error: {error}</div>;
	}

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
					{logs.map((log) => (
						<tr key={self.crypto.randomUUID()} className='hover:bg-gray-100'>
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
