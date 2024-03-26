import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Badge, Dropdown, Table, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import PaginationControls from './PaginationControls';
import StatusBadge from './StatusBadge';

// Configure axios defaults just once, possibly outside of the component or in a separate file
axios.defaults.withCredentials = true;

const Logs = () => {
	const [logs, setLogs] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [logsPerPage] = useState(10); // If not changing, no setter needed
	const [filter, setFilter] = useState('all');
	const [serviceFilter, setServiceFilter] = useState('all');
	const navigate = useNavigate();
	const { isAdmin } = useAuth();

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		fetchLogs();
	}, [isAdmin]); // Removed navigate from dependency array, as it's unlikely to change

	const fetchLogs = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/logs`;
		try {
			const { data } = await axios.get(endpoint);
			if (Array.isArray(data)) {
				const sortedData = data.sort(
					(a, b) => new Date(b.timestamp) - new Date(a.timestamp)
				);
				setLogs(sortedData);
			} else {
				console.error('Data is not an array:', data);
			}
		} catch (error) {
			console.error('Failed to fetch logs:', error);
			alert('Failed to fetch logs.');
		}
	};

	const uniqueServices = [...new Set(logs.map((log) => log.service))];
	const filteredLogs = logs.filter(
		(log) =>
			(filter === 'all' || log.level === filter) &&
			(serviceFilter === 'all' || log.service === serviceFilter)
	);
	const indexOfFirstLog = (currentPage - 1) * logsPerPage;
	const currentLogs = filteredLogs.slice(
		indexOfFirstLog,
		indexOfFirstLog + logsPerPage
	);
	const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

	return (
		<Container fluid>
			<div className='p-3 mb-3 d-flex justify-content-end'>
				{/* Dropdowns for filtering */}
				<DropdownFilter
					id='dropdown-level'
					title='Filter Logs'
					items={['all', 'error', 'warn', 'info', 'debug']}
					onSelect={setFilter}
				/>
				<DropdownFilter
					id='dropdown-service'
					title='Filter Service'
					items={['all', ...uniqueServices]}
					onSelect={setServiceFilter}
				/>
			</div>
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
		</Container>
	);
};

// A helper component to render Dropdown filters, assuming repetitive structure
function DropdownFilter({ id, title, items, onSelect }) {
	return (
		<Dropdown className='mx-2'>
			<Dropdown.Toggle variant='secondary' id={id}>
				{title}
			</Dropdown.Toggle>
			<Dropdown.Menu>
				{items.map((item) => (
					<Dropdown.Item key={item} onClick={() => onSelect(item)}>
						{item.charAt(0).toUpperCase() + item.slice(1)}
					</Dropdown.Item>
				))}
			</Dropdown.Menu>
		</Dropdown>
	);
}

export default Logs;
