// Conversations.js
import React from 'react';
import { ListGroup, Container, Row, Col } from 'react-bootstrap';

const ConversationsComponent = ({
	conversations,
	title,
	onConversationSelect,
}) => {
	const formatIsoDateString = (isoDateString) => {
		if (!isoDateString) return 'Date not available';
		const date = new Date(isoDateString);
		return new Intl.DateTimeFormat('en-GB', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
			timeZone: 'UTC',
		}).format(date);
	};

	const getParticipantNames = (participants) => {
		return participants
			.filter((p) => p.participantId && p.participantType !== title)
			.map(
				(p) =>
					p.participantId?.rescueName || p.participantId?.firstName || 'Unknown'
			)
			.join(', ');
	};

	// Sort conversations by lastMessageAt date in descending order
	const sortedConversations = conversations.sort((a, b) => {
		const dateA = new Date(a.lastMessageAt);
		const dateB = new Date(b.lastMessageAt);
		return dateB - dateA; // For descending order
	});

	return (
		<div
			className='d-flex flex-column align-items-stretch flex-shrink-0 bg-body-tertiary'
			style={{ width: '380px' }}
		>
			<Container className='p-3 border-bottom'>
				<Row className='align-items-center'>
					<Col>
						<span className='fs-5 fw-semibold'>Messages</span>
					</Col>
				</Row>
			</Container>
			<ListGroup className='list-group-flush border-bottom scrollarea'>
				{sortedConversations.map((conversation) => (
					<ListGroup.Item
						action
						key={conversation._id}
						onClick={() => onConversationSelect(conversation)} // Add this line
						className={`py-3 lh-sm ${
							conversation.status === 'active' ? 'bg-info' : 'bg-secondary'
						}`}
						aria-current={conversation.status === 'active' ? 'true' : undefined}
					>
						<div className='d-flex w-100 justify-content-between'>
							<small className='text-muted'>
								{getParticipantNames(conversation.participants)}
							</small>
							<small
								className={
									conversation.status === 'active' ? '' : 'text-body-secondary'
								}
							>
								{conversation.lastMessageAt
									? formatIsoDateString(conversation.lastMessageAt)
									: 'Date not available'}
							</small>
						</div>
						<div className='d-flex w-100 align-items-center justify-content-between'>
							<strong className='mb-1'>{conversation.lastMessage}</strong>
						</div>
						<div className='col-10 mb-1 small'>{conversation.content}</div>
					</ListGroup.Item>
				))}
			</ListGroup>
		</div>
	);
};

export default ConversationsComponent;
