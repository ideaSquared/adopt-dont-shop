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
						<td>
							{rating.adopter_first_name} {rating.adopter_last_name}
						</td>
						<td
							style={{
								backgroundColor:
									rating.rating_type === 'love' ? '#FF1493' : '#58D68D',
							}}
						>
							{rating.rating_type}
						</td>
						<td>
							<Button
								onClick={() =>
									onCreateConversation(rating.pet_id, rating.userid)
								}
								variant='secondary'
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
