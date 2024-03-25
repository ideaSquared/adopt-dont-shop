// Logs.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Badge, Dropdown, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true;

const Logs = () => {
	const [logs, setLogs] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [logsPerPage, setLogsPerPage] = useState(10);
	const navigate = useNavigate();
	const { isAdmin } = useAuth();
	const [filter, setFilter] = useState('all');
	const [serviceFilter, setServiceFilter] = useState('all'); // Default to 'all'

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		fetchLogs();
	}, [isAdmin, navigate]);

	const uniqueServices = Array.from(new Set(logs.map((log) => log.service)));

	// Filter logs based on selected level and service
	const filteredLogs = logs.filter(
		(log) =>
			(filter === 'all' || log.level === filter) &&
			(serviceFilter === 'all' || log.service === serviceFilter)
	);

	// Then, compute pagination details based on the filtered logs
	const indexOfLastLog = currentPage * logsPerPage;
	const indexOfFirstLog = indexOfLastLog - logsPerPage;
	const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
	const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

	// Handlers for pagination controls
	const handlePreviousClick = () => {
		setCurrentPage(currentPage - 1);
	};

	const handleNextClick = () => {
		setCurrentPage(currentPage + 1);
	};

	const fetchLogs = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/logs`;
		try {
			const res = await axios.get(endpoint);
			if (Array.isArray(res.data)) {
				// Assuming each log has a 'timestamp' field and sorting by it.
				const sortedData = res.data.sort((a, b) => {
					// Convert timestamps to dates and compare them to sort in descending order.
					return new Date(b.timestamp) - new Date(a.timestamp);
				});
				console.log(sortedData);
				setLogs(sortedData);
			} else {
				console.error('Data is not an array:', res.data);
				setLogs([]);
			}
		} catch (error) {
			alert('Failed to fetch logs.');
			console.error(error);
		}
	};

	// Function to determine badge variant based on log level
	const getBadgeVariant = (level) => {
		switch (level) {
			case 'error':
				return 'danger'; // Red badge for errors
			case 'warn':
				return 'warning'; // Yellow badge for warnings
			case 'info':
				return 'info'; // Blue badge for info
			case 'debug':
				return 'secondary'; // Grey badge for debug messages
			default:
				return 'primary'; // Default to a blue badge if level is unrecognized
		}
	};

	return (
		<>
			<Container>
				<div className='p-3 mb-3 d-flex justify-content-end'>
					<Dropdown className='mx-2'>
						<Dropdown.Toggle variant='secondary' id='dropdown-level'>
							Filter Logs
						</Dropdown.Toggle>

						<Dropdown.Menu>
							<Dropdown.Item onClick={() => setFilter('all')}>
								All
							</Dropdown.Item>
							<Dropdown.Item onClick={() => setFilter('error')}>
								Error
							</Dropdown.Item>
							<Dropdown.Item onClick={() => setFilter('warn')}>
								Warn
							</Dropdown.Item>
							<Dropdown.Item onClick={() => setFilter('info')}>
								Info
							</Dropdown.Item>
							<Dropdown.Item onClick={() => setFilter('debug')}>
								Debug
							</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown>

					<Dropdown className='mx-2'>
						<Dropdown.Toggle variant='secondary' id='dropdown-service'>
							Filter Service
						</Dropdown.Toggle>

						<Dropdown.Menu>
							<Dropdown.Item onClick={() => setServiceFilter('all')}>
								All Services
							</Dropdown.Item>
							{uniqueServices.map((service) => (
								<Dropdown.Item
									key={service}
									onClick={() => setServiceFilter(service)}
								>
									{service}
								</Dropdown.Item>
							))}
						</Dropdown.Menu>
					</Dropdown>
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
						{currentLogs
							.filter(
								(log) =>
									(filter === 'all' || log.level === filter) &&
									(serviceFilter === 'all' || log.service === serviceFilter)
							)
							.map((log) => (
								<tr key={log._id}>
									<td>{new Date(log.timestamp).toLocaleString()}</td>
									<td>
										<Badge bg={getBadgeVariant(log.level)}>
											{log.level.toUpperCase()}
										</Badge>
									</td>
									<td>{log.service}</td>
									<td>{log.message}</td>
								</tr>
							))}
					</tbody>
				</Table>

				{/* Pagination Controls */}
				<div className='d-flex justify-content-between mt-3'>
					<button
						className='btn btn-info'
						disabled={currentPage === 1}
						onClick={handlePreviousClick}
					>
						Previous
					</button>
					<button
						className='btn btn-info'
						disabled={currentPage >= totalPages}
						onClick={handleNextClick}
					>
						Next
					</button>
				</div>
			</Container>
		</>
	);
};

export default Logs;
