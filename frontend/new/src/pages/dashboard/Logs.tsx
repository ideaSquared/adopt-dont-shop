import React, { useState, useEffect } from 'react';
import {
	FormInput,
	SelectInput,
	TextInput,
	Table,
	DateTime,
} from '@adoptdontshop/components';
import { AuditLog } from '@adoptdontshop/libs/audit-logs/AuditLogs';
import AuditLogservice from '@adoptdontshop/libs/audit-logs/AuditLogsService';

const AuditLogs: React.FC = () => {
	const [auditlogs, setAuditLogs] = useState<AuditLog[]>([]);
	const [filteredAuditLogs, setFilteredAuditLogs] = useState<AuditLog[]>([]);
	const [searchTerm, setSearchTerm] = useState<string | null>(null);
	const [serviceTerm, setServiceTerm] = useState<string | null>(null);

	useEffect(() => {
		// Fetch auditlogs from the AuditLogservice
		const fetchedAuditAuditLogs = AuditLogservice.getAuditLogs();
		setAuditLogs(fetchedAuditAuditLogs);
		setFilteredAuditLogs(fetchedAuditAuditLogs);
	}, []);

	useEffect(() => {
		// Filter auditlogs based on searchTerm and serviceTerm
		const filtered = auditlogs.filter((log) => {
			const matchesSearch = !searchTerm || log.log_id.includes(searchTerm);
			const matchesService = !serviceTerm || log.service.includes(serviceTerm);
			return matchesSearch && matchesService;
		});
		setFilteredAuditLogs(filtered);
	}, [searchTerm, serviceTerm, auditlogs]);

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
		...Array.from(new Set(auditlogs.map((log) => log.service))).map(
			(service) => ({
				value: service,
				label: service,
			})
		),
	];

	return (
		<div>
			<h1>AuditLogs</h1>
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
					{filteredAuditLogs.map((auditLog) => (
						<tr key={auditLog.log_id}>
							<td>{auditLog.log_id}</td>
							<td>{auditLog.user_id || 'No ID'}</td>
							<td>
								<DateTime timestamp={auditLog.timestamp} showTooltip={true} />
							</td>
							<td>{auditLog.level}</td>
							<td>{auditLog.service}</td>
							<td>{auditLog.message}</td>
						</tr>
					))}
				</tbody>
			</Table>
		</div>
	);
};

export default AuditLogs;
