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

	const createConversation = async (petId, userId) => {
		// Assuming `userId` is the ID of the user you want to start a conversation with
		// and `rescueProfile.id` is the current rescue's ID.
		const participants = [
			{ participantId: rescueProfile.id, participantType: 'Rescue' },
			{ participantId: userId, participantType: 'User' },
		];
		const pet = petId;

		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/conversations`,
				{ participants, pet },
				{ withCredentials: true }
			);
			console.log('Conversation created:', response.data);
			// Here you might want to do something with the response, like showing a success message
		} catch (error) {
			console.error('Failed to create conversation:', error);
			// Handle error, e.g., by showing an error message to the user
		}
	};

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
								<Button
									onClick={() =>
										createConversation(rating.petId, rating.userId)
									}
								>
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
