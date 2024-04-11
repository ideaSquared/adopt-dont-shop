import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';
import LogsTable from '../../components/tables/LogsTable';
import { LogsService } from '../../services/LogService';
import GenericFilterForm from '../../components/forms/GenericFilterForm';

const Logs = () => {
	const [logs, setLogs] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [logsPerPage] = useState(10);
	const [filter, setFilter] = useState('');
	const [serviceFilter, setServiceFilter] = useState('');

	useAdminRedirect();

	useEffect(() => {
		fetchAndSetLogs();
	}, []);

	const fetchAndSetLogs = async () => {
		try {
			const fetchedLogs = await LogsService.fetchLogs();
			setLogs(fetchedLogs);
		} catch (error) {
			alert(error.message);
		}
	};

	const uniqueServices = [...new Set(logs.map((log) => log.service))];
	const filteredLogs = logs.filter(
		(log) =>
			(filter === '' || log.level === filter) &&
			(serviceFilter === '' || log.service === serviceFilter)
	);
	const indexOfFirstLog = (currentPage - 1) * logsPerPage;
	const currentLogs = filteredLogs.slice(
		indexOfFirstLog,
		indexOfFirstLog + logsPerPage
	);
	const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

	const filters = [
		{
			type: 'select',
			value: filter,
			onChange: (e) => setFilter(e.target.value),
			options: [
				{ value: '', label: 'All levels' },
				{ value: 'error', label: 'Error' },
				{ value: 'warn', label: 'Warn' },
				{ value: 'info', label: 'Info' },
				{ value: 'debug', label: 'Debug' },
			],
			md: 6,
		},
		{
			type: 'select',
			value: serviceFilter,
			onChange: (e) => setServiceFilter(e.target.value),
			options: [
				{ value: '', label: 'All services' },
				...uniqueServices.map((service) => ({
					value: service,
					label: service,
				})),
			],
			md: 6,
		},
	];

	return (
		<div>
			<GenericFilterForm filters={filters} />
			<LogsTable
				currentLogs={currentLogs}
				currentPage={currentPage}
				totalPages={totalPages}
				setCurrentPage={setCurrentPage}
			/>
		</div>
	);
};

export default Logs;
