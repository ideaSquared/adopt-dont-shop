import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';
import StatusBadge from '../common/StatusBadge';

const ConversationDetailsModal = ({
	showModal,
	handleClose,
	conversation,
	messages,
	loadingMessages,
}) => {
	return (
		<Modal show={showModal} onHide={handleClose} size='lg'>
			<Modal.Header closeButton>
				<Modal.Title>Conversation Details</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				{conversation ? (
					<>
						<p>
							<strong>Participants:</strong>{' '}
							{conversation.participant_emails
								.filter(Boolean)
								.map((email, index) => (
									<StatusBadge
										key={index}
										type='conversation'
										value={email}
										caps={false}
									/>
								))}
							{conversation.participant_rescues
								.filter(Boolean)
								.map((rescueName, index) => (
									<StatusBadge
										key={index}
										type='conversation'
										value={rescueName}
										caps={false}
									/>
								))}
						</p>
						<p>
							<strong>Status:</strong>{' '}
							<StatusBadge type='conversation' value={conversation.status} />
						</p>
						<h5>Messages</h5>
						{loadingMessages ? (
							<p>Loading messages...</p>
						) : (
							<Table striped bordered hover size='sm'>
								<thead>
									<tr>
										<th>Text</th>
										<th>Sent At</th>
										<th>Sent By</th>
									</tr>
								</thead>
								<tbody>
									{messages
										.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
										.map((message) => (
											<tr key={message.message_id}>
												<td>{message.message_id}</td>
												<td style={{ whiteSpace: 'pre-wrap' }}>
													{message.message_text}
												</td>
												<td>{new Date(message.sent_at).toLocaleString()}</td>
												<td>{message.sender_email || 'Unknown'}</td>
											</tr>
										))}
								</tbody>
							</Table>
						)}
					</>
				) : (
					<p>Loading conversation details...</p>
				)}
			</Modal.Body>
			<Modal.Footer>
				<Button variant='secondary' onClick={handleClose}>
					Close
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export default ConversationDetailsModal;
