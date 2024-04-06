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
		<Modal show={showModal} onHide={handleClose}>
			<Modal.Header closeButton>
				<Modal.Title>Conversation Details</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				{conversation ? (
					<>
						<p>
							<strong>Participants:</strong>{' '}
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
									{messages.map((message) => (
										<tr key={message._id}>
											<td>{message.messageText}</td>
											<td>{new Date(message.sentAt).toLocaleString()}</td>
											<td>{message.senderId.email || 'Unknown'}</td>
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
