// src/types/logsTable.d.ts

import { Log } from './log';

export interface LogsTableProps {
	currentLogs: Log[];
	currentPage: number;
	totalPages: number;
	setCurrentPage: (page: number) => void;
}
