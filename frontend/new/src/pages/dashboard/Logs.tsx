import React, { useState, useEffect } from 'react';
import {
	FormInput,
	SelectInput,
	TextInput,
	Table,
	Button,
} from '@adoptdontshop/components';
import { Log } from '@adoptdontshop/libs/logs/Logs';
import LogService from '@adoptdontshop/libs/logs/LogsService';

const Logs: React.FC = () => {
	const [logs, setLogs] = useState<Log[]>([]);
	const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
	const [searchTerm, setSearchTerm] = useState<string | null>(null);
	const [serviceTerm, setServiceTerm] = useState<string | null>(null);

	useEffect(() => {
		// Fetch logs from the LogService
		const fetchedLogs = LogService.getLogs();
		setLogs(fetchedLogs);
		setFilteredLogs(fetchedLogs);
	}, []);

	useEffect(() => {
		// Filter logs based on searchTerm and serviceTerm
		const filtered = logs.filter((log) => {
			const matchesSearch = !searchTerm || log.log_id.includes(searchTerm);
			const matchesService = !serviceTerm || log.service.includes(serviceTerm);
			return matchesSearch && matchesService;
		});
		setFilteredLogs(filtered);
	}, [searchTerm, serviceTerm, logs]);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleServiceFilterChange = (
		e: React.ChangeEvent<HTMLSelectElement>
	) => {
		setServiceTerm(e.target.value);
	};

	const serviceOptions = [
		{ value: '', label: 'All Services' },
		...Array.from(new Set(logs.map((log) => log.service))).map((service) => ({
			value: service,
			label: service,
		})),
	];

	return (
		<div>
			<h1>Logs</h1>
			<FormInput label='Search by ID'>
				<TextInput
					onChange={handleSearchChange}
					type='text'
					value={searchTerm || ''}
				/>
			</FormInput>
			<FormInput label='Filter by service'>
				<SelectInput
					onChange={handleServiceFilterChange}
					value={serviceTerm || ''}
					options={serviceOptions}
				/>
			</FormInput>
			<Table>
				<thead>
					<tr>
						<th>ID</th>
						<th>User ID</th>
						<th>Timestamp</th>
						<th>Level</th>
						<th>Service</th>
						<th>Message</th>
					</tr>
				</thead>
				<tbody>
					{filteredLogs.map((log) => (
						<tr key={log.log_id}>
							<td>{log.log_id}</td>
							<td>{log.user_id || 'No ID'}</td>
							<td>{new Date(log.timestamp).toLocaleString()}</td>
							<td>{log.level}</td>
							<td>{log.service}</td>
							<td>{log.message}</td>
						</tr>
					))}
				</tbody>
			</Table>
		</div>
	);
};

export default Logs;
