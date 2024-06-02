import { useState, useEffect } from 'react';
import { LogsService } from '../services/LogService';
import { Log } from '../types/log';

export const useLogs = () => {
	const [logs, setLogs] = useState<Log[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [logsPerPage] = useState(10);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchLogs();
	}, []);

	const fetchLogs = async () => {
		setIsLoading(true);
		try {
			const data = await LogsService.fetchLogs();
			setLogs(data);
			setIsLoading(false);
		} catch (error) {
			setError('Failed to fetch logs.');
			setIsLoading(false);
		}
	};

	const indexOfLastLog = currentPage * logsPerPage;
	const indexOfFirstLog = indexOfLastLog - logsPerPage;
	const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
	const totalPages = Math.ceil(logs.length / logsPerPage);

	return {
		logs: currentLogs,
		currentPage,
		totalPages,
		isLoading,
		error,
		setCurrentPage,
	};
};
