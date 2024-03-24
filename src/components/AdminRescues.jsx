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
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/rescues`;
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
					<th>Location</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{rescues.map((rescue) => (
					<tr key={rescue._id}>
						<td>{rescue.name}</td>
						<td>{rescue.location}</td>
						<td>{/* Implement actions such as edit or delete */}</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default Rescues;
