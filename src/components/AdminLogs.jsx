// Logs.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true;

const Logs = () => {
	const [logs, setLogs] = useState([]);
	const navigate = useNavigate();
	const { isAdmin } = useAuth();

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		fetchLogs();
	}, [isAdmin, navigate]);

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

	return (
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
				{logs.map((log) => (
					<tr key={log._id}>
						<td>{new Date(log.timestamp).toLocaleString()}</td>
						<td>{log.level}</td>
						<td>{log.service}</td>
						<td>{log.message}</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default Logs;
