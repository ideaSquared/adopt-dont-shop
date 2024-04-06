import React from 'react';
import Table from 'react-bootstrap/Table';
import PaginationControls from '../common/PaginationControls';
import StatusBadge from '../common/StatusBadge';

// Assuming currentLogs, currentPage, totalPages, and setCurrentPage are passed as props
const LogsTable = ({
	currentLogs,
	currentPage,
	totalPages,
	setCurrentPage,
}) => {
	return (
		<div>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>Timestamp</th>
						<th>Level</th>
						<th>Service</th>
						<th>Message</th>
					</tr>
				</thead>
				<tbody>
					{currentLogs.map((log) => (
						<tr key={log._id}>
							<td>{new Date(log.timestamp).toLocaleString()}</td>
							<td>
								<StatusBadge type='loglevel' value={log.level} />
							</td>
							<td>
								<StatusBadge type='logservice' value={log.service} />
							</td>
							<td>{log.message}</td>
						</tr>
					))}
				</tbody>
			</Table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
		</div>
	);
};

export default LogsTable;
