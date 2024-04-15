import React from 'react';
import { Table, Button } from 'react-bootstrap';
import StatusBadge from '../common/StatusBadge';
import PaginationControls from '../common/PaginationControls';

const ConversationsTable = ({
	conversations,
	onDelete,
	onShowDetails,
	currentPage,
	totalPages,
	onChangePage,
}) => {
	return (
		<>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>Conversation ID</th>
						<th>Participants</th>
						<th>Rescue</th> {/* Added column for rescue */}
						<th>Last Message</th>
						<th>Last Message At</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{conversations.map((conversation) => (
						<tr
							key={conversation.conversation_id} // Adjust key to match your data structure
							style={{ cursor: 'pointer' }}
							onClick={() => onShowDetails(conversation)}
						>
							<td>{conversation.conversation_id}</td>
							<td>
								{conversation.participant_emails.join(', ')}{' '}
								{/* Assuming participant_emails is an array of email strings */}
							</td>
							<td>
								{conversation.rescue_name || 'N/A'}{' '}
								{/* Display the rescue name if available */}
							</td>
							<td>{conversation.last_message_by_email}</td>
							<td>{new Date(conversation.updated_at).toLocaleString()}</td>
							<td>
								<StatusBadge
									type='conversation'
									value={conversation.status || ''}
								/>
							</td>
							<td>
								<Button
									variant='danger'
									onClick={(e) => {
										e.stopPropagation(); // Prevent triggering onShowDetails
										onDelete(conversation.conversation_id); // Use the appropriate identifier
									}}
								>
									Delete
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={onChangePage}
			/>
		</>
	);
};

export default ConversationsTable;
