// Pets.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true;

const Pets = () => {
	const [pets, setPets] = useState([]);
	const navigate = useNavigate();
	const { isAdmin } = useAuth();

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		fetchPets();
	}, [isAdmin, navigate]);

	const fetchPets = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/pets`;
		try {
			const res = await axios.get(endpoint);
			if (Array.isArray(res.data)) {
				setPets(res.data);
			} else {
				console.error('Data is not an array:', res.data);
				setPets([]);
			}
		} catch (error) {
			alert('Failed to fetch pets.');
			console.error(error);
		}
	};

	return (
		<Table striped bordered hover>
			<thead>
				<tr>
					<th>Pet Name</th>
					<th>Type</th>
					<th>Status</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{pets.map((pet) => (
					<tr key={pet._id}>
						<td>{pet.petName}</td>
						<td>{pet.type}</td>
						<td>{pet.status}</td>
						<td>
							{
								<Button variant='danger' onClick={() => deletePet(pet._id)}>
									Delete
								</Button>
							}
						</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default Pets;
