import React from 'react';
import { Table, Button } from 'react-bootstrap';

const RatingsTable = ({ filteredRatings, onCreateConversation }) => {
	return (
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
									onCreateConversation(rating.petId, rating.userId)
								}
							>
								Start Conversation
							</Button>
						</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default RatingsTable;
