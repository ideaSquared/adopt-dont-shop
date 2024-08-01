import React from 'react';
import { Log } from '../types/log';
import StatusBadge from '../components/common/StatusBadge';

const logsColumns = () => [
	{
		header: 'Timestamp',
		accessor: 'timestamp',
		render: (row: Log) => new Date(row.timestamp).toLocaleString(),
	},
	{
		header: 'Level',
		accessor: 'level',
		render: (row: Log) => <StatusBadge type='loglevel' value={row.level} />,
	},
	{
		header: 'Service',
		accessor: 'service',
		render: (row: Log) => <StatusBadge type='logservice' value={row.service} />,
	},
	{
		header: 'Message',
		accessor: 'message',
	},
];

export default logsColumns;
