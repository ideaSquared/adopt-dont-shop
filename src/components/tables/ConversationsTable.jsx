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
						<th>Participants</th>
						<th>Last Message</th>
						<th>Last Message At</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{conversations.map((conversation) => (
						<tr
							key={conversation._id}
							style={{ cursor: 'pointer' }}
							onClick={() => onShowDetails(conversation)}
						>
							<td>
								{conversation.participants.map((participant, index) => (
									<React.Fragment key={index}>
										<StatusBadge
											type='conversation'
											value={
												participant.participantId.email ||
												participant.participantId.rescueName ||
												'Unknown'
											}
											caps={false}
										/>{' '}
									</React.Fragment>
								))}
							</td>
							<td>{conversation.lastMessage}</td>
							<td>{new Date(conversation.lastMessageAt).toLocaleString()}</td>
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
										onDelete(conversation._id);
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
