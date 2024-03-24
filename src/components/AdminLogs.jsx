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
				setLogs(res.data);
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
					<th>Date</th>
					<th>User</th>
					<th>Action</th>
					<th>Details</th>
				</tr>
			</thead>
			<tbody>
				{logs.map((log) => (
					<tr key={log._id}>
						<td>{new Date(log.date).toLocaleString()}</td>
						<td>{log.user}</td>
						<td>{log.action}</td>
						<td>{log.details}</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default Logs;
