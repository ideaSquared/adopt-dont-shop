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
						<td>{rating.name}</td>
						<td>{rating.userfirstname}</td>
						<td>{rating.ratingtype}</td>
						<td>
							<Button
								onClick={() =>
									onCreateConversation(rating.pet_id, rating.userid)
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
