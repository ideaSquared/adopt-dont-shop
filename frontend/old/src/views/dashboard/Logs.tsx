import React from 'react';
import Table from '../../components/tables/Table';
import { useLogs } from '../../hooks/useLogs';
import { Log } from '../../types/log';
import logsColumns from '../../config/logsColumns';

const LogsPage: React.FC = () => {
	const { logs, isLoading, error } = useLogs();

	const columns = logsColumns();

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error: {error}</div>;
	}

	return (
		<div className='container mx-auto my-4'>
			<h1 className='text-2xl font-bold mb-4'>Logs</h1>
			<Table columns={columns} data={logs} />
		</div>
	);
};

export default LogsPage;
