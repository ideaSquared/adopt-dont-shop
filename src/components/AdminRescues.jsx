// Rescues.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true;

const Rescues = () => {
	const [rescues, setRescues] = useState([]);
	const navigate = useNavigate();
	const { isAdmin } = useAuth();

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		fetchRescues();
	}, [isAdmin, navigate]);

	const fetchRescues = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/rescues`;
		try {
			const res = await axios.get(endpoint);
			if (Array.isArray(res.data)) {
				setRescues(res.data);
			} else {
				console.error('Data is not an array:', res.data);
				setRescues([]);
			}
		} catch (error) {
			alert('Failed to fetch rescues.');
			console.error(error);
		}
	};

	return (
		<Table striped bordered hover>
			<thead>
				<tr>
					<th>Rescue Name</th>
					<th>Type</th>
				</tr>
			</thead>
			<tbody>
				{rescues.map((rescue) => (
					<tr key={rescue._id}>
						<td>{rescue.rescueName}</td>
						<td>{rescue.rescueType}</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default Rescues;
