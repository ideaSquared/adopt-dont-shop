import React from 'react';
import LogsTable from '../../components/tables/LogsTable';

const LogsPage: React.FC = () => {
	return (
		<div className='container mx-auto my-4'>
			<h1 className='text-2xl font-bold mb-4'>Logs</h1>
			<LogsTable />
		</div>
	);
};

export default LogsPage;
