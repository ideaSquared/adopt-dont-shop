import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Table, Container, Row, Col, Button } from 'react-bootstrap';

const RescueAdopterManagement = ({ rescueProfile }) => {
	const [ratings, setRatings] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterCriteria, setFilterCriteria] = useState('');

	useEffect(() => {
		fetchRatings();
	}, [rescueProfile.id]);

	const fetchRatings = async () => {
		if (!rescueProfile.id) return;
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_BASE_URL}/ratings/find-ratings/${
					rescueProfile.id
				}`,
				{
					withCredentials: true,
				}
			);
			console.log(response.data);
			setRatings(response.data);
		} catch (error) {
			console.error('Failed to fetch ratings:', error);
		}
	};

	const filteredRatings = ratings.filter((rating) => {
		return (
			rating.ratingType != 'dislike' &&
			(filterCriteria ? rating.criteria === filterCriteria : true) &&
			(searchTerm
				? rating.petName.toLowerCase().includes(searchTerm.toLowerCase())
				: true)
		);
	});

	return (
		<Container>
			<h2>Pet Ratings</h2>
			<Row className='mb-3'>
				<Col md={6}>
					<Form.Control
						type='text'
						placeholder='Search by pet name...'
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</Col>
				<Col md={6}>
					<Form.Select
						value={filterCriteria}
						onChange={(e) => setFilterCriteria(e.target.value)}
					>
						<option value=''>All Criteria</option>
						{/* Populate this with actual filter options based on your ratings data */}
					</Form.Select>
				</Col>
			</Row>
			<Table striped bordered hover responsive>
				<thead>
					<tr>
						<th>Pet Name</th>
						<th>User First Name</th>
						<th>Rating Type</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{filteredRatings.map((rating) => (
						<tr key={rating.id}>
							<td>{rating.petName}</td>
							<td>{rating.userFirstName}</td>
							<td>{rating.ratingType}</td>
							<td>
								<Button onClick={() => startConversation(rating.id)}>
									Start Conversation
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
		</Container>
	);
};

export default RescueAdopterManagement;
